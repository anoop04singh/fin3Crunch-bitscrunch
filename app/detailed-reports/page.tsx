"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  FileText,
  TrendingUp,
  DollarSign,
  Info,
  Sparkles,
  Percent,
  Gem,
  Fish,
  BarChart4,
  ArrowLeftRight,
} from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { XCircle } from "lucide-react"
import { sleep } from "@/lib/utils"

// Interfaces based on API Documentation
interface NftMetadata {
  collection_name: string
  description: string
  image_url: string
  token_id: string
  contract_address: string
  blockchain: string
  attributes?: Array<{ trait_type: string; value: string }>
}

interface CollectionMetadata {
  collection_name: string
  description: string
  image_url: string
  contract_address: string
  distinct_nft_count: number
  blockchain: string
}

interface CollectionAnalytics {
  volume: number
  sales: number
  transactions: number
  floor_price_usd: number
  block_dates: string
  volume_trend: string
  sales_trend: string
  transactions_trend: string
  assets_trend: string
}

interface NftPriceEstimate {
  price_estimate: number
  price_estimate_lower_bound: number
  price_estimate_upper_bound: number
}

interface NftScores {
  rarity_score: number
  price_ceiling: number
}

interface CollectionScores {
  marketcap: number
  price_avg: number
  price_ceiling: number
}

interface CollectionWhales {
  whale_holders: number
  unique_buy_wallets: number
  unique_sell_wallets: number
  top_whales: Array<{ wallet_address: string; nft_count: number }>
}

interface TrendData {
  date: string
  [key: string]: any
}

interface DetailedReportData {
  isSpecificNft: boolean
  nftMetadata?: NftMetadata
  collectionMetadata?: CollectionMetadata
  collectionAnalytics?: CollectionAnalytics
  nftPriceEstimate?: NftPriceEstimate
  nftScores?: NftScores
  collectionScores?: CollectionScores
  collectionWhales?: CollectionWhales
  floorVsEstimateDiffPercent?: number
  recommendation?: string
  collectionTrends?: TrendData[]
}

export default function DetailedReportsPage() {
  const [inputNftContract, setInputNftContract] = useState<string>("")
  const [inputNftTokenId, setInputNftTokenId] = useState<string>("")

  const [loadingReport, setLoadingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [reportData, setReportData] = useState<DetailedReportData | null>(null)

  const fetchApiData = useCallback(async (endpoint: string, params?: any) => {
    const maxRetries = 3
    let attempt = 0
    while (attempt < maxRetries) {
      try {
        const res = await fetch("/api/bitscrunch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, params }),
        })
        if (res.status === 429) {
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`Rate limit hit for ${endpoint}. Retrying in ${delay}ms...`)
          await sleep(delay)
          attempt++
          continue
        }
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || `API Error: ${res.statusText}`)
        }
        const data = await res.json()
        return data.data
      } catch (error) {
        attempt++
        if (attempt >= maxRetries) throw error
      }
    }
  }, [])

  const parseTrendData = (analytics: CollectionAnalytics): TrendData[] => {
    try {
      const parse = (str: string | null | undefined) => {
        if (!str || typeof str !== "string" || str.length <= 2) return []
        return str
          .slice(1, -1)
          .split(",")
          .map((s) => s.replace(/"/g, "").trim())
      }
      const dates = parse(analytics.block_dates)
      if (dates.length === 0) return []

      const volumes = parse(analytics.volume_trend).map(Number)
      const sales = parse(analytics.sales_trend).map(Number)
      const transactions = parse(analytics.transactions_trend).map(Number)
      const assets = parse(analytics.assets_trend).map(Number)

      return dates
        .map((date, i) => ({
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          volume: volumes[i] || 0,
          sales: sales[i] || 0,
          transactions: transactions[i] || 0,
          assets: assets[i] || 0,
        }))
        .reverse()
    } catch (e) {
      console.error("Error parsing trend data:", e)
      return []
    }
  }

  const getRecommendation = (estimatedPrice?: number, floorPrice?: number): string => {
    if (estimatedPrice === undefined || floorPrice === undefined) return "Not enough data"
    const diffPercent = ((estimatedPrice - floorPrice) / floorPrice) * 100
    if (diffPercent > 20) return "Strong Buy"
    if (diffPercent > 5) return "Buy"
    if (diffPercent < -20) return "Strong Sell"
    if (diffPercent < -5) return "Sell"
    return "Hold"
  }

  const fetchReportData = async () => {
    setLoadingReport(true)
    setReportError(null)
    setAiSummary(null)
    setReportData(null)

    const isSpecificNft = !!inputNftTokenId.trim()
    const contractAddress = inputNftContract.trim()

    try {
      const promises = [
        fetchApiData("/nft/collection/metadata", { contract_address: contractAddress }),
        fetchApiData("/nft/collection/analytics", { contract_address: contractAddress, time_range: "30d", sort_by: "sales" }),
        fetchApiData("/nft/collection/scores", { contract_address: contractAddress, time_range: "30d", sort_by: "marketcap" }),
        fetchApiData("/nft/collection/whales", { contract_address: contractAddress, time_range: "30d", sort_by: "nft_count" }),
      ]

      if (isSpecificNft) {
        promises.push(
          fetchApiData("/nft/metadata", { contract_address: contractAddress, token_id: inputNftTokenId }),
          fetchApiData("/nft/liquify/price_estimate", { contract_address: contractAddress, token_id: inputNftTokenId }),
          fetchApiData("/nft/scores", { contract_address: contractAddress, token_id: inputNftTokenId, sort_by: "price_ceiling" }),
        )
      }

      const results = await Promise.allSettled(promises)
      console.log("API Call Results:", results)

      const [
        collectionMetadataRes,
        collectionAnalyticsRes,
        collectionScoresRes,
        collectionWhalesRes,
        nftMetadataRes,
        nftPriceEstimateRes,
        nftScoresRes,
      ] = results

      const collectionMetadata =
        collectionMetadataRes.status === "fulfilled" ? collectionMetadataRes.value?.[0] : null
      const collectionAnalytics =
        collectionAnalyticsRes.status === "fulfilled" ? collectionAnalyticsRes.value?.[0] : null
      const collectionScores = collectionScoresRes.status === "fulfilled" ? collectionScoresRes.value?.[0] : null
      const collectionWhales = collectionWhalesRes.status === "fulfilled" ? collectionWhalesRes.value?.[0] : null
      const nftMetadata = isSpecificNft && nftMetadataRes?.status === "fulfilled" ? nftMetadataRes.value?.[0] : null
      const nftPriceEstimate =
        isSpecificNft && nftPriceEstimateRes?.status === "fulfilled" ? nftPriceEstimateRes.value?.[0] : null
      const nftScores = isSpecificNft && nftScoresRes?.status === "fulfilled" ? nftScoresRes.value?.[0] : null

      if (!collectionMetadata && !nftMetadata) {
        throw new Error("Could not fetch essential metadata for the contract address.")
      }

      const floorPrice = collectionAnalytics?.floor_price_usd
      const estimatedPrice = nftPriceEstimate?.price_estimate

      const floorVsEstimateDiffPercent =
        floorPrice != null && estimatedPrice != null && Number(floorPrice) !== 0
          ? ((Number(estimatedPrice) - Number(floorPrice)) / Number(floorPrice)) * 100
          : undefined

      const recommendation = getRecommendation(
        estimatedPrice != null ? Number(estimatedPrice) : undefined,
        floorPrice != null ? Number(floorPrice) : undefined,
      )

      const collectionTrends = collectionAnalytics ? parseTrendData(collectionAnalytics) : []

      setReportData({
        isSpecificNft,
        collectionMetadata,
        collectionAnalytics,
        collectionScores,
        collectionWhales,
        nftMetadata,
        nftPriceEstimate,
        nftScores,
        floorVsEstimateDiffPercent,
        recommendation,
        collectionTrends,
      })
    } catch (err: any) {
      setReportError(`Failed to generate report: ${err.message || "An unknown error occurred."}`)
    } finally {
      setLoadingReport(false)
    }
  }

  const generateAiSummary = async () => {
    if (!reportData) return
    setLoadingAi(true)
    setAiSummary(null)
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData, promptType: "nft_report_summary" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate AI summary")
      setAiSummary(data.summary)
    } catch (err: any) {
      setReportError(`AI Summary Error: ${err.message}`)
    } finally {
      setLoadingAi(false)
    }
  }

  const isGenerateButtonDisabled = loadingReport || loadingAi || !inputNftContract

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">NFT ANALYSIS REPORT</h1>
          <p className="text-sm text-neutral-400">Generate in-depth analytics for NFT collections and tokens</p>
        </div>
        <Button
          onClick={fetchReportData}
          disabled={isGenerateButtonDisabled}
          className="bg-teal-500 hover:bg-teal-600 text-white"
        >
          {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          {loadingReport ? "Generating..." : "Generate Report"}
        </Button>
      </div>

      <Card className="bg-neutral-900 border-neutral-700">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-3">
            <Label htmlFor="nft-contract" className="text-neutral-400 text-xs mb-2 block">
              Collection Contract Address
            </Label>
            <Input
              id="nft-contract"
              placeholder="Enter contract address (e.g., 0x...)"
              value={inputNftContract}
              onChange={(e) => setInputNftContract(e.target.value)}
              className="bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="nft-token-id" className="text-neutral-400 text-xs mb-2 block">
              Token ID (Optional)
            </Label>
            <Input
              id="nft-token-id"
              placeholder="Enter token ID for specific NFT"
              value={inputNftTokenId}
              onChange={(e) => setInputNftTokenId(e.target.value)}
              className="bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
            />
          </div>
        </CardContent>
      </Card>

      {reportError && (
        <div className="text-red-500 mt-4 text-center flex items-center justify-center">
          <XCircle className="w-5 h-5 mr-2" /> {reportError}
        </div>
      )}

      {loadingReport && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <span className="ml-3 text-neutral-400">Fetching and analyzing on-chain data...</span>
        </div>
      )}

      {reportData && (
        <div className="space-y-6 animate-fade-in">
          {/* AI Summary */}
          <Card className="bg-neutral-900 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" /> AI-POWERED INSIGHTS
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAi ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                  <span className="ml-2 text-neutral-400">Generating AI summary...</span>
                </div>
              ) : aiSummary ? (
                <p className="text-sm text-neutral-300 leading-relaxed">{aiSummary}</p>
              ) : (
                <Button onClick={generateAiSummary} className="bg-teal-500 hover:bg-teal-600 text-white">
                  Generate AI Summary
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Main Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-neutral-900 border-neutral-700 p-4 flex flex-col items-center text-center">
              <img
                src={
                  (reportData.isSpecificNft ? reportData.nftMetadata?.image_url : reportData.collectionMetadata?.image_url) ||
                  "/placeholder.svg"
                }
                alt="NFT"
                className="w-48 h-48 rounded-lg object-cover border border-neutral-700 mb-4"
              />
              <h2 className="text-xl font-bold text-white">
                {reportData.collectionMetadata?.collection_name}
                {reportData.isSpecificNft && ` #${reportData.nftMetadata?.token_id}`}
              </h2>
              <p className="text-xs text-neutral-500 font-mono mt-1 truncate w-full px-4">
                {reportData.collectionMetadata?.contract_address}
              </p>
              <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
                {(reportData.isSpecificNft
                  ? reportData.nftMetadata?.description
                  : reportData.collectionMetadata?.description
                )?.substring(0, 150) || "No description available."}
                ...
              </p>
            </Card>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-neutral-900 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Price Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-neutral-400 text-sm">Floor Price</span>
                    <span className="text-2xl font-bold text-white font-mono">
                      $
                      {reportData.collectionAnalytics?.floor_price_usd != null
                        ? Number(reportData.collectionAnalytics.floor_price_usd).toFixed(2)
                        : "N/A"}
                    </span>
                  </div>
                  {reportData.isSpecificNft && (
                    <>
                      <div className="flex justify-between items-baseline">
                        <span className="text-neutral-400 text-sm">Est. Token Price</span>
                        <span className="text-2xl font-bold text-teal-400 font-mono">
                          $
                          {reportData.nftPriceEstimate?.price_estimate != null
                            ? Number(reportData.nftPriceEstimate.price_estimate).toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 text-right">
                        Range: $
                        {reportData.nftPriceEstimate?.price_estimate_lower_bound != null
                          ? Number(reportData.nftPriceEstimate.price_estimate_lower_bound).toFixed(2)
                          : "N/A"}{" "}
                        - $
                        {reportData.nftPriceEstimate?.price_estimate_upper_bound != null
                          ? Number(reportData.nftPriceEstimate.price_estimate_upper_bound).toFixed(2)
                          : "N/A"}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                        <span className="text-neutral-400 text-sm">Premium/Discount</span>
                        <span
                          className={`text-lg font-bold font-mono flex items-center gap-1 ${
                            (reportData.floorVsEstimateDiffPercent ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          <Percent className="w-4 h-4" />
                          {reportData.floorVsEstimateDiffPercent != null
                            ? Number(reportData.floorVsEstimateDiffPercent).toFixed(2)
                            : "N/A"}
                          %
                        </span>
                      </div>
                      <div className="text-sm text-center pt-2">
                        Recommendation: <span className="font-bold text-teal-400">{reportData.recommendation}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-neutral-900 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                    <Gem className="w-4 h-4" /> Score Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reportData.isSpecificNft ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Rarity Score</span>
                        <span className="text-white font-mono">
                          {reportData.nftScores?.rarity_score != null
                            ? Number(reportData.nftScores.rarity_score).toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Price Ceiling</span>
                        <span className="text-white font-mono">
                          $
                          {reportData.nftScores?.price_ceiling != null
                            ? Number(reportData.nftScores.price_ceiling).toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Market Cap</span>
                        <span className="text-white font-mono">
                          $
                          {reportData.collectionScores?.marketcap != null
                            ? Number(reportData.collectionScores.marketcap).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Average Price</span>
                        <span className="text-white font-mono">
                          $
                          {reportData.collectionScores?.price_avg != null
                            ? Number(reportData.collectionScores.price_avg).toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Price Ceiling</span>
                        <span className="text-white font-mono">
                          $
                          {reportData.collectionScores?.price_ceiling != null
                            ? Number(reportData.collectionScores.price_ceiling).toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Market Analytics */}
          <Card className="bg-neutral-900 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Market Analytics (30d)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-neutral-400">Volume</p>
                <p className="text-xl font-bold text-white font-mono">
                  ${(reportData.collectionAnalytics?.volume ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Sales</p>
                <p className="text-xl font-bold text-white font-mono">
                  {(reportData.collectionAnalytics?.sales ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Unique Buyers</p>
                <p className="text-xl font-bold text-white font-mono">
                  {(reportData.collectionWhales?.unique_buy_wallets ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Unique Sellers</p>
                <p className="text-xl font-bold text-white font-mono">
                  {(reportData.collectionWhales?.unique_sell_wallets ?? 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trend Charts */}
          {reportData.collectionTrends && reportData.collectionTrends.length > 0 && (
            <Card className="bg-neutral-900 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                  <BarChart4 className="w-4 h-4" /> Collection Trends (30d)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["volume", "sales", "transactions", "assets"].map((key) => (
                  <div key={key}>
                    <h3 className="text-sm font-medium text-white mb-2 capitalize">{key} Trend</h3>
                    <ChartContainer config={{}} className="h-[200px] w-full">
                      <ResponsiveContainer>
                        <LineChart data={reportData.collectionTrends} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey={key} stroke="hsl(var(--chart-2))" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Holder Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-neutral-900 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                  <Fish className="w-4 h-4" /> Whale Watch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white mb-2">{reportData.collectionWhales?.whale_holders ?? "N/A"}</p>
                <p className="text-sm text-neutral-400 mb-4">Top Whales by Holdings:</p>
                <div className="space-y-2">
                  {(reportData.collectionWhales?.top_whales || []).slice(0, 5).map((whale, i) => (
                    <div key={i} className="flex justify-between text-xs bg-neutral-800/50 p-2 rounded">
                      <span className="text-neutral-300 font-mono">{whale.wallet_address}</span>
                      <span className="text-white font-bold">{whale.nft_count} NFTs</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {reportData.isSpecificNft && reportData.nftMetadata?.attributes && (
              <Card className="bg-neutral-900 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                    <Info className="w-4 h-4" /> Token Attributes
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {(Array.isArray(reportData.nftMetadata.attributes) ? reportData.nftMetadata.attributes : []).map(
                    (attr, i) => (
                      <div key={i} className="bg-neutral-800/50 p-2 rounded text-center">
                        <p className="text-xs text-neutral-400 uppercase">{attr.trait_type}</p>
                        <p className="text-sm font-semibold text-white">{attr.value}</p>
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
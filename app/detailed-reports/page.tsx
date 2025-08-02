"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Users,
  ChevronRight,
  TrendingDown,
} from "lucide-react"
import { XCircle } from "lucide-react"
import { sleep } from "@/lib/utils"
import { AnimatedSection } from "@/components/animated-section"
import { toast } from "sonner"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { LineChartComponent } from "@/components/ui/line-chart"

// Interfaces
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
  block_dates: string | string[]
  volume_trend: string | number[]
  sales_trend: string | number[]
  transactions_trend: string | number[]
  assets_trend: string | number[]
  volume_change?: number
  sales_change?: number
}

interface NftPriceEstimate {
  price_estimate: number
  price_estimate_lower_bound: number
  price_estimate_upper_bound: number
}

interface CollectionScores {
  marketcap: number
  price_avg: number
  price_ceiling: number
}

interface CollectionWhales {
  buy_whales: string
  sell_whales: string
  unique_buy_wallets: string
  unique_sell_wallets: string
  unique_wallets: string
  whale_holders: string
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
  collectionScores?: CollectionScores
  collectionWhales?: CollectionWhales
  recommendation?: string
  collectionTrends?: TrendData[]
}

const formatPercentChange = (change: number | null | undefined) => {
  if (change === null || change === undefined) {
    return null
  }
  const percent = change * 100
  const isPositive = percent >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown
  const colorClass = isPositive ? "text-green-500" : "text-red-500"

  return (
    <span className={`font-bold flex items-center gap-1 ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {percent.toFixed(2)}%
    </span>
  )
}

// Helper component for displaying key metrics
const MetricItem = ({
  title,
  value,
  subValue,
  icon: Icon,
  className = "",
}: {
  title: string
  value: React.ReactNode
  subValue?: React.ReactNode
  icon: React.ElementType
  className?: string
}) => (
  <div className={`border-l-2 border-neutral-800 pl-4 ${className}`}>
    <div className="flex items-center text-neutral-400 text-sm mb-1">
      <Icon className="w-4 h-4 mr-2" />
      <span>{title}</span>
    </div>
    <div className="text-3xl font-bold text-white font-mono">{value}</div>
    {subValue && <div className="text-xs text-neutral-500 mt-1">{subValue}</div>}
  </div>
)

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
      const safeParse = (data: string | any[] | null | undefined): any[] => {
        if (Array.isArray(data)) return data
        if (!data || typeof data !== "string" || data.length <= 2) return []
        return data
          .slice(1, -1)
          .split(",")
          .map((s) => s.replace(/"/g, "").trim())
      }
      const dates = safeParse(analytics.block_dates)
      if (dates.length === 0) return []

      const volumes = safeParse(analytics.volume_trend).map(Number)
      const sales = safeParse(analytics.sales_trend).map(Number)
      const transactions = safeParse(analytics.transactions_trend).map(Number)
      const assets = safeParse(analytics.assets_trend).map(Number)

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

    const loadingMessages = [
      "Fetching collection metadata...",
      "Analyzing market trends (30d)...",
      "Calculating collection scores...",
      "Identifying whale activity...",
      "Compiling final report...",
    ]

    if (isSpecificNft) {
      loadingMessages.splice(1, 0, "Retrieving specific token details...")
      loadingMessages.splice(4, 0, "Estimating token price...")
    }

    const toastId = toast.loading("Generating your report...", {
      description: loadingMessages[0],
    })

    let messageIndex = 1
    const intervalId = setInterval(() => {
      if (messageIndex < loadingMessages.length) {
        toast.loading("Generating your report...", {
          id: toastId,
          description: loadingMessages[messageIndex],
        })
        messageIndex++
      }
    }, 1500)

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

      if (!collectionMetadata && !nftMetadata) {
        throw new Error("Could not fetch essential metadata for the contract address.")
      }

      const floorPrice = collectionAnalytics?.floor_price_usd
      const estimatedPrice = nftPriceEstimate?.price_estimate

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
        recommendation,
        collectionTrends,
      })
      toast.success("Report Generated Successfully", { id: toastId })
    } catch (err: any) {
      const errorMessage = `Failed to generate report: ${err.message || "An unknown error occurred."}`
      setReportError(errorMessage)
      toast.error("Failed to Generate Report", { id: toastId, description: err.message || "An unknown error occurred." })
    } finally {
      clearInterval(intervalId)
      setLoadingReport(false)
    }
  }

  const generateAiSummary = async () => {
    if (!reportData) return
    const toastId = toast.loading("Generating AI summary...")
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
      toast.success("AI Summary Generated", { id: toastId })
    } catch (err: any) {
      setReportError(`AI Summary Error: ${err.message}`)
      toast.error("Failed to Generate Summary", { id: toastId, description: err.message || "An unknown error occurred." })
    } finally {
      setLoadingAi(false)
    }
  }

  const isGenerateButtonDisabled = loadingReport || loadingAi || !inputNftContract

  return (
    <div className="p-6 space-y-8">
      <AnimatedSection className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white tracking-wider">ASSET ANALYSIS REPORT</h1>
        <p className="text-base text-neutral-400 mt-2">
          Generate in-depth analytics for any NFT collection or specific token on the Ethereum blockchain.
        </p>
        <div className="flex items-center gap-2 mt-8 w-full">
          <Input
            id="nft-contract"
            placeholder="Collection Contract Address"
            value={inputNftContract}
            onChange={(e) => setInputNftContract(e.target.value)}
            className="bg-neutral-900/50 border-neutral-700 text-white placeholder-neutral-500 flex-grow h-12 text-base"
          />
          <Input
            id="nft-token-id"
            placeholder="Token ID"
            value={inputNftTokenId}
            onChange={(e) => setInputNftTokenId(e.target.value)}
            className="bg-neutral-900/50 border-neutral-700 text-white placeholder-neutral-500 w-32 h-12 text-base"
          />
          <Button
            onClick={fetchReportData}
            disabled={isGenerateButtonDisabled}
            size="icon"
            className="bg-teal-500 hover:bg-teal-600 text-white h-12 w-12 flex-shrink-0"
          >
            {loadingReport ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>
      </AnimatedSection>

      {reportError && (
        <div className="text-red-500 mt-4 text-center flex items-center justify-center max-w-3xl mx-auto">
          <XCircle className="w-5 h-5 mr-2" /> {reportError}
        </div>
      )}

      {reportData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto space-y-16"
        >
          {/* Header Section */}
          <AnimatedSection>
            <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                src={
                  (reportData.isSpecificNft ? reportData.nftMetadata?.image_url : reportData.collectionMetadata?.image_url) ||
                  "/placeholder.svg"
                }
                alt="NFT"
                className="w-48 h-48 rounded-2xl object-cover border-2 border-neutral-800 shadow-2xl shadow-teal-500/10"
              />
              <div className="flex-1">
                <h2 className="text-4xl font-bold text-white">
                  {reportData.collectionMetadata?.collection_name}
                  {reportData.isSpecificNft && ` #${reportData.nftMetadata?.token_id}`}
                </h2>
                <p className="text-sm text-neutral-500 font-mono mt-2 truncate">
                  {reportData.collectionMetadata?.contract_address}
                </p>
                <p className="text-base text-neutral-400 mt-4 max-w-2xl mx-auto md:mx-0">
                  {(reportData.isSpecificNft
                    ? reportData.nftMetadata?.description
                    : reportData.collectionMetadata?.description
                  ) || "No description available."}
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* AI Summary */}
          <AnimatedSection>
            <div className="relative border-l-4 border-teal-500 pl-8 py-4 bg-neutral-900/30 rounded-r-lg">
              <Sparkles className="absolute -left-4 top-4 w-6 h-6 text-teal-400 bg-neutral-900 p-1 rounded-full" />
              <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Insights</h3>
              {aiSummary ? (
                <MarkdownRenderer content={aiSummary} />
              ) : (
                <Button
                  onClick={generateAiSummary}
                  size="sm"
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                  disabled={loadingAi}
                >
                  {loadingAi ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generate AI Summary
                </Button>
              )}
            </div>
          </AnimatedSection>

          {/* Key Metrics */}
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <MetricItem
                icon={DollarSign}
                title="Floor Price"
                value={`$${
                  reportData.collectionAnalytics?.floor_price_usd != null
                    ? Number(reportData.collectionAnalytics.floor_price_usd).toFixed(2)
                    : "N/A"
                }`}
              />
              {reportData.isSpecificNft && (
                <MetricItem
                  icon={DollarSign}
                  title="Est. Token Price"
                  value={`$${
                    reportData.nftPriceEstimate?.price_estimate != null
                      ? Number(reportData.nftPriceEstimate.price_estimate).toFixed(2)
                      : "N/A"
                  }`}
                />
              )}
              <MetricItem
                icon={TrendingUp}
                title="30d Volume"
                value={`$${(reportData.collectionAnalytics?.volume ?? 0).toLocaleString()}`}
                subValue={formatPercentChange(reportData.collectionAnalytics?.volume_change)}
              />
              <MetricItem
                icon={Gem}
                title="Market Cap"
                value={`$${
                  reportData.collectionScores?.marketcap != null
                    ? Number(reportData.collectionScores.marketcap).toLocaleString()
                    : "N/A"
                }`}
              />
            </div>
          </AnimatedSection>

          {/* Trend Charts */}
          {reportData.collectionTrends && reportData.collectionTrends.length > 0 && (
            <AnimatedSection>
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Collection Trends (30d)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {["volume", "sales", "transactions", "assets"].map((key) => {
                  const labels = reportData.collectionTrends?.map((d) => d.date) || []
                  const datasets = [
                    {
                      label: key.charAt(0).toUpperCase() + key.slice(1),
                      data: reportData.collectionTrends?.map((d) => d[key]) || [],
                      color: "hsl(160 100% 40%)",
                    },
                  ]
                  return (
                    <div key={key} className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
                      <h4 className="text-base font-medium text-white mb-4 capitalize text-center">{key} Trend</h4>
                      <div className="h-[200px] w-full">
                        <LineChartComponent labels={labels} datasets={datasets} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </AnimatedSection>
          )}

          {/* Whale Watch & Attributes */}
          <AnimatedSection>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {reportData.collectionWhales && (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Fish className="w-5 h-5 text-teal-400" /> Whale Watch (30d)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-neutral-400">Unique Wallets</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {reportData.collectionWhales.unique_wallets ?? "N/A"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-neutral-400">Whale Holders</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {reportData.collectionWhales.whale_holders ?? "N/A"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-neutral-400">Buy Whales</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {reportData.collectionWhales.buy_whales ?? "N/A"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-neutral-400">Sell Whales</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {reportData.collectionWhales.sell_whales ?? "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {reportData.isSpecificNft && reportData.nftMetadata?.attributes && (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-teal-400" /> Token Attributes
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                    {(Array.isArray(reportData.nftMetadata.attributes) ? reportData.nftMetadata.attributes : []).map(
                      (attr, i) => (
                        <div key={i} className="bg-neutral-800/50 p-3 rounded text-center">
                          <p className="text-xs text-neutral-400 uppercase">{attr.trait_type}</p>
                          <p className="text-sm font-semibold text-white mt-1">{attr.value}</p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </AnimatedSection>
        </motion.div>
      )}
    </div>
  )
}
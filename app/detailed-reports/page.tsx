"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileText, ImageIcon, TrendingUp, DollarSign, Info, Sparkles, Percent } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { XCircle } from "lucide-react"
import { sleep } from "@/lib/utils" // Import the sleep utility

// Interfaces (re-using from dashboard page for consistency)
interface NftHolding {
  blockchain: string
  chain_id: string
  contract_address: string
  collection_name: string
  nft_contract_type: string
  token_id: string
  quantity: number
  image_url?: string
  price_estimate_usd?: number // Added for enriched NFT data
}

interface Erc20Holding {
  token_name: string
  token_symbol: string
  token_decimal: number
  quantity: number
  blockchain_name: string
  chain_id: string
  usd_value?: number
  token_address?: string // Added for historical price fetching
}

interface WalletScore {
  wallet_address: string
  anomalous_pattern_score: number
  associated_token_score: number
  risk_interaction_score: number
  wallet_age_score: number
  wallet_score: number
  classification: string
  centralized_interaction_score?: number
  chain_id?: number
  classification_type?: string
  frequency_score?: number
  illicit?: string
  smart_contract_interaction_score?: number
  staking_governance_interaction_score?: number
  volume_score?: number
}

interface NftMetadata {
  collection_name: string
  description: string
  image_url: string
  token_id: string
  contract_address: string
  blockchain: string
  rarity_score?: number
  price_estimate_usd?: number
  attributes?: Array<{ trait_type: string; value: string }>
}

interface HistoricalPriceData {
  date: string
  price: number
}

// New interfaces for NFT Report data
interface CollectionMetadata {
  collection_name: string
  description: string
  image_url: string
  contract_address: string
  slug_name: string
  total_supply: number
  blockchain: string
}

interface CollectionAnalytics {
  contract_address: string
  volume_usd: number
  volume_change_percentage: number
  floor_price_usd: number
  transaction_count: number
  unique_buyers: number
  unique_sellers: number
  time_range: string
  sales: number // Added from API response
  sales_change: number // Added from API response
  assets: number // Added from API response
  assets_change: number // Added from API response
  // Raw trend strings
  assets_trend: string
  block_dates: string
  sales_trend: string
  transactions_trend: string
  transfers: number
  transfers_change: number
  transfers_trend: string
  volume_trend: string
}

interface NftPriceEstimate {
  contract_address: string
  token_id: string
  estimated_price_usd: number
  rarity_sales_usd: number
  collection_drivers_usd: number
  blockchain: string
  price_estimate_lower_bound: number // Added from API response
  price_estimate_upper_bound: number // Added from API response
  prediction_percentile: number // Added from API response
}

interface NftScores {
  contract_address: string
  token_id: string
  rarity_score: number
  liquidity_score: number
  popularity_score: number
  market_sentiment_score: number
  trending_status: string
}

interface NftAnalytics {
  contract_address: string
  token_id: string
  sales_volume_usd: number
  transaction_count: number
  average_price_usd: number
  time_range: string
}

interface CollectionWhales {
  contract_address: string
  whale_count: number
  top_whales: Array<{ wallet_address: string; nft_count: number }>
}

// New interface for parsed trend data
interface CollectionTrendData {
  date: string
  volume: number
  sales: number
  transactions: number
  assets: number
}

interface DetailedNftReportData {
  nftMetadata: NftMetadata | null
  collectionMetadata: CollectionMetadata | null
  collectionAnalytics: CollectionAnalytics | null
  nftPriceEstimate: NftPriceEstimate | null
  nftScores: NftScores | null
  nftAnalytics: NftAnalytics | null
  collectionWhales: CollectionWhales | null
  floor_vs_estimate_diff_percent: number | null
  recommendation: string | null
  collectionTrends: CollectionTrendData[] // Added for charting
}

export default function DetailedReportsPage() {
  const [reportType, setReportType] = useState<"connected_wallet" | "specific_nft" | "specific_wallet">(
    "connected_wallet",
  )
  const [inputWalletAddress, setInputWalletAddress] = useState<string>("")
  const [inputNftContract, setInputNftContract] = useState<string>("")
  const [inputNftTokenId, setInputNftTokenId] = useState<string>("")

  const [loadingReport, setLoadingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  // Report Data States
  const [reportNftHoldings, setReportNftHoldings] = useState<NftHolding[]>([])
  const [reportErc20Holdings, setReportErc20Holdings] = useState<Erc20Holding[]>([])
  const [reportWalletScore, setReportWalletScore] = useState<WalletScore | null>(null)
  const [reportTotalAssetValue, setReportTotalAssetValue] = useState<number>(0)
  const [reportDetailedNftData, setReportDetailedNftData] = useState<DetailedNftReportData | null>(null)
  const [reportTokenHistoricalPrices, setReportTokenHistoricalPrices] = useState<{
    [symbol: string]: HistoricalPriceData[]
  }>({})

  // Get connected wallet address from local storage or context
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(null)

  useEffect(() => {
    const storedWallet = localStorage.getItem("connectedWalletAddress")
    if (storedWallet) {
      setConnectedWalletAddress(storedWallet)
      // Only set inputWalletAddress if it's a connected wallet report and not already set
      if (reportType === "connected_wallet" && !inputWalletAddress) {
        setInputWalletAddress(storedWallet)
      }
    }
  }, [reportType, inputWalletAddress])

  // Update inputWalletAddress when connectedWalletAddress changes for 'connected_wallet' type
  useEffect(() => {
    if (reportType === "connected_wallet" && connectedWalletAddress) {
      setInputWalletAddress(connectedWalletAddress)
    }
  }, [reportType, connectedWalletAddress])

  const fetchApiData = useCallback(async (endpoint: string, walletAddress: string, params?: any) => {
    const maxRetries = 5
    let currentRetry = 0
    let delay = 1000 // Initial delay of 1 second

    while (currentRetry < maxRetries) {
      try {
        const res = await fetch("/api/bitscrunch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, walletAddress, params }),
        })
        const data = await res.json()

        // Log the raw data received from the API
        console.log(`API Response for ${endpoint}:`, data)

        if (res.status === 429) {
          console.warn(
            `Rate limit hit for ${endpoint}. Retrying in ${delay}ms... (Attempt ${currentRetry + 1}/${maxRetries})`,
          )
          await sleep(delay)
          delay *= 2 // Exponential backoff
          currentRetry++
          continue // Try again
        }

        if (!res.ok) {
          console.error(`Failed to fetch ${endpoint}:`, data.error)
          throw new Error(data.error || `Failed to fetch ${endpoint}`)
        }
        return data.data
      } catch (error) {
        if (currentRetry < maxRetries - 1) {
          console.warn(
            `Error fetching ${endpoint}: ${error}. Retrying in ${delay}ms... (Attempt ${currentRetry + 1}/${maxRetries})`,
          )
          await sleep(delay)
          delay *= 2
          currentRetry++
        } else {
          throw error // Re-throw if max retries reached
        }
      }
    }
    throw new Error(`Failed to fetch ${endpoint} after ${maxRetries} retries.`)
  }, [])

  const parseTrendData = (
    blockDatesStr: string,
    volumeTrendStr: string,
    salesTrendStr: string,
    transactionsTrendStr: string,
    assetsTrendStr: string,
  ): CollectionTrendData[] => {
    try {
      const parseArrayString = (str: string) =>
        str
          .slice(1, -1)
          .split(",")
          .map((s) => s.replace(/"/g, "").trim())

      const blockDates = parseArrayString(blockDatesStr)
      const volumeTrend = parseArrayString(volumeTrendStr).map(Number)
      const salesTrend = parseArrayString(salesTrendStr).map(Number)
      const transactionsTrend = parseArrayString(transactionsTrendStr).map(Number)
      const assetsTrend = parseArrayString(assetsTrendStr).map(Number)

      const trends: CollectionTrendData[] = blockDates.map((dateStr, index) => ({
        date: new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        volume: volumeTrend[index] || 0,
        sales: salesTrend[index] || 0,
        transactions: transactionsTrend[index] || 0,
        assets: assetsTrend[index] || 0,
      }))
      return trends.reverse() // API returns most recent first, charts usually go oldest to newest
    } catch (e) {
      console.error("Error parsing trend data:", e)
      return []
    }
  }

  const fetchReportData = async (targetAddress: string, nftContract?: string, nftTokenId?: string) => {
    setLoadingReport(true)
    setReportError(null)
    setAiSummary(null)
    setReportNftHoldings([])
    setReportErc20Holdings([])
    setReportWalletScore(null)
    setReportTotalAssetValue(0)
    setReportDetailedNftData(null)
    setReportTokenHistoricalPrices({})

    try {
      if (reportType === "specific_nft" && nftContract && nftTokenId) {
        // Fetch data for a specific NFT report
        const [
          nftMetadataData,
          nftPriceEstimateData,
          nftAnalyticsData,
          nftScoresData,
          collectionMetadataData,
          collectionAnalyticsData,
          collectionWhalesData,
        ] = await Promise.all([
          fetchApiData("/nft/metadata", targetAddress, { contract_address: nftContract, token_id: nftTokenId }),
          fetchApiData("/nft/liquify/price_estimate", targetAddress, {
            contract_address: nftContract,
            token_id: nftTokenId,
          }),
          fetchApiData("/nft/analytics", targetAddress, { contract_address: nftContract, token_id: nftTokenId }),
          fetchApiData("/nft/scores", targetAddress, { contract_address: nftContract, token_id: nftTokenId }),
          fetchApiData("/nft/collection/metadata", targetAddress, { contract_address: nftContract }),
          fetchApiData("/nft/collection/analytics", targetAddress, {
            contract_address: nftContract,
            time_range: "30d",
          }),
          fetchApiData("/nft/collection/whales", targetAddress, { contract_address: nftContract, time_range: "30d" }),
        ])

        const nftMetadata = nftMetadataData?.[0] || null
        const nftPriceEstimate = nftPriceEstimateData?.[0] || null
        const nftAnalytics = nftAnalyticsData?.[0] || null
        const nftScores = nftScoresData?.[0] || null
        const collectionMetadata = collectionMetadataData?.[0] || null
        const collectionAnalytics = collectionAnalyticsData?.[0] || null
        const collectionWhales = collectionWhalesData?.[0] || null

        let floorVsEstimateDiffPercent: number | null = null
        if (nftPriceEstimate?.estimated_price_usd && collectionAnalytics?.floor_price_usd) {
          floorVsEstimateDiffPercent =
            ((nftPriceEstimate.estimated_price_usd - collectionAnalytics.floor_price_usd) /
              collectionAnalytics.floor_price_usd) *
            100
        }

        const recommendation = getRecommendation(
          nftPriceEstimate?.estimated_price_usd,
          collectionAnalytics?.floor_price_usd,
        )

        const collectionTrends = collectionAnalytics
          ? parseTrendData(
              collectionAnalytics.block_dates,
              collectionAnalytics.volume_trend,
              collectionAnalytics.sales_trend,
              collectionAnalytics.transactions_trend,
              collectionAnalytics.assets_trend,
            )
          : []

        setReportDetailedNftData({
          nftMetadata,
          collectionMetadata,
          collectionAnalytics,
          nftPriceEstimate,
          nftScores,
          nftAnalytics,
          collectionWhales,
          floor_vs_estimate_diff_percent: floorVsEstimateDiffPercent,
          recommendation,
          collectionTrends,
        })
      } else {
        // Fetch full wallet data for connected_wallet or specific_wallet
        const [nftHoldingsData, erc20HoldingsData, walletScoreData] = await Promise.all([
          fetchApiData("/wallet/balance/nft", targetAddress),
          fetchApiData("/wallet/balance/token", targetAddress),
          fetchApiData("/wallet/score", targetAddress),
        ])

        setReportNftHoldings(nftHoldingsData || [])
        setReportErc20Holdings(erc20HoldingsData || [])
        setReportWalletScore(walletScoreData?.[0] || null)

        const totalValue = (erc20HoldingsData || []).reduce((sum: number, item: any) => sum + (item.usd_value || 0), 0)
        setReportTotalAssetValue(totalValue)

        // Fetch NFT metadata for all NFTs in holdings
        const nftMetadataPromises = (nftHoldingsData || []).map((nft: NftHolding) =>
          fetchApiData("/nft/metadata", targetAddress, {
            contract_address: nft.contract_address,
            token_id: nft.token_id,
          }).catch((err) => {
            console.error(`Failed to fetch metadata for NFT ${nft.token_id}:`, err)
            return null
          }),
        )
        const allNftMetadataResults = await Promise.all(nftMetadataPromises)
        const enrichedNfts = (nftHoldingsData || []).map((nft: NftHolding, index: number) => {
          const metadata = allNftMetadataResults[index]?.[0]
          return { ...nft, ...metadata }
        })
        setReportNftHoldings(enrichedNfts)

        // Fetch historical prices for ERC20 tokens
        const historicalPricePromises = (erc20HoldingsData || []).map((token: Erc20Holding) => {
          if (token.token_address) {
            return fetchApiData("/token/historical_price", targetAddress, {
              token_address: token.token_address,
              time_range: "30d", // Last 30 days
              interval: "1d", // Daily interval
            })
              .then((data) => ({ symbol: token.token_symbol, data: data || [] }))
              .catch((err) => {
                console.error(`Failed to fetch historical price for ${token.token_symbol}:`, err)
                return { symbol: token.token_symbol, data: [] }
              })
          }
          return Promise.resolve({ symbol: token.token_symbol, data: [] })
        })
        const allHistoricalPrices = await Promise.all(historicalPricePromises)
        const historicalPricesMap: { [symbol: string]: HistoricalPriceData[] } = {}
        allHistoricalPrices.forEach((item) => {
          historicalPricesMap[item.symbol] = item.data.map((d: any) => ({
            date: new Date(d.timestamp).toLocaleDateString(),
            price: d.price,
          }))
        })
        setReportTokenHistoricalPrices(historicalPricesMap)
      }
    } catch (err: any) {
      console.error("Error fetching report data:", err)
      setReportError(`Failed to load report data: ${err.message || "Unknown error"}`)
    } finally {
      setLoadingReport(false)
    }
  }

  const generateAiSummary = async () => {
    setLoadingAi(true)
    setAiSummary(null)
    try {
      let aiReportData: any = {}
      let aiPromptType = ""

      if (reportType === "specific_nft" && reportDetailedNftData) {
        aiReportData = reportDetailedNftData
        aiPromptType = "nft_report_summary"
      } else {
        aiReportData = {
          walletAddress: inputWalletAddress,
          nftHoldings: reportNftHoldings,
          erc20Holdings: reportErc20Holdings,
          walletScore: reportWalletScore,
          totalAssetsValue: reportTotalAssetValue,
          tokenHistoricalPrices: reportTokenHistoricalPrices,
        }
        aiPromptType = "wallet_summary"
      }

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: aiReportData, promptType: aiPromptType }),
      })
      const data = await res.json()
      if (res.ok) {
        setAiSummary(data.summary)
      } else {
        throw new Error(data.error || "Failed to generate AI summary")
      }
    } catch (err: any) {
      console.error("Error generating AI summary:", err)
      setReportError(`Failed to generate AI summary: ${err.message || "Unknown error"}`)
    } finally {
      setLoadingAi(false)
    }
  }

  const handleGenerateReport = () => {
    if (reportType === "connected_wallet") {
      if (connectedWalletAddress) {
        fetchReportData(connectedWalletAddress)
      } else {
        setReportError("Please connect your wallet first or select 'Specific Wallet Report'.")
      }
    } else if (reportType === "specific_wallet") {
      if (inputWalletAddress) {
        fetchReportData(inputWalletAddress)
      } else {
        setReportError("Please enter a wallet address.")
      }
    } else if (reportType === "specific_nft") {
      if (inputNftContract && inputNftTokenId) {
        fetchReportData("0xDummyAddress", inputNftContract, inputNftTokenId) // Dummy address for NFT metadata endpoint
      } else {
        setReportError("Please enter NFT contract address and token ID.")
      }
    }
  }

  const getRecommendation = (estimatedPrice: number | undefined, floorPrice: number | undefined): string => {
    if (estimatedPrice === undefined || floorPrice === undefined) {
      return "Data not available for recommendation."
    }

    const diff = estimatedPrice - floorPrice
    const percentageDiff = (diff / floorPrice) * 100

    if (percentageDiff > 20) {
      return "Strong Buy: Estimated price significantly above floor. Potential undervaluation."
    } else if (percentageDiff > 5) {
      return "Buy: Estimated price above floor. Good entry point."
    } else if (percentageDiff < -20) {
      return "Strong Sell: Estimated price significantly below floor. Potential overvaluation or declining interest."
    } else if (percentageDiff < -5) {
      return "Sell: Estimated price below floor. Consider taking profit or re-evaluating."
    } else {
      return "Hold: Estimated price is close to floor. Monitor market trends."
    }
  }

  const isGenerateButtonDisabled =
    loadingReport ||
    loadingAi ||
    (reportType === "connected_wallet" && !connectedWalletAddress) ||
    (reportType === "specific_wallet" && !inputWalletAddress) ||
    (reportType === "specific_nft" && (!inputNftContract || !inputNftTokenId))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">DETAILED REPORTS</h1>
          <p className="text-sm text-neutral-400">Generate in-depth analytics for wallets and NFTs</p>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerateButtonDisabled}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          {loadingReport ? "Generating..." : "Generate Report"}
        </Button>
      </div>

      {/* Report Type Selection */}
      <Card className="bg-neutral-900 border-neutral-700 p-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">REPORT TYPE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
            <SelectTrigger className="w-full bg-neutral-800 border-neutral-600 text-white">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700 text-white">
              <SelectItem value="connected_wallet">Connected Wallet Report</SelectItem>
              <SelectItem value="specific_nft">Specific NFT Report</SelectItem>
              <SelectItem value="specific_wallet">Specific Wallet Report</SelectItem>
            </SelectContent>
          </Select>

          {reportType === "specific_wallet" && (
            <div>
              <Label htmlFor="wallet-address" className="text-neutral-400 text-xs mb-2 block">
                Wallet Address
              </Label>
              <Input
                id="wallet-address"
                placeholder="Enter wallet address (e.g., 0x...)"
                value={inputWalletAddress}
                onChange={(e) => setInputWalletAddress(e.target.value)}
                className="bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
              />
            </div>
          )}

          {reportType === "specific_nft" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nft-contract" className="text-neutral-400 text-xs mb-2 block">
                  NFT Contract Address
                </Label>
                <Input
                  id="nft-contract"
                  placeholder="Enter contract address"
                  value={inputNftContract}
                  onChange={(e) => setInputNftContract(e.target.value)}
                  className="bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
                />
              </div>
              <div>
                <Label htmlFor="nft-token-id" className="text-neutral-400 text-xs mb-2 block">
                  NFT Token ID
                </Label>
                <Input
                  id="nft-token-id"
                  placeholder="Enter token ID"
                  value={inputNftTokenId}
                  onChange={(e) => setInputNftTokenId(e.target.value)}
                  className="bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {reportError && (
        <div className="text-red-500 mt-4 text-center flex items-center justify-center">
          <XCircle className="w-5 h-5 mr-2" /> {reportError}
        </div>
      )}

      {loadingReport && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-3 text-neutral-400">Fetching report data...</span>
        </div>
      )}

      {!loadingReport && !reportError && (
        <>
          {/* AI Summary */}
          {(reportDetailedNftData ||
            reportNftHoldings.length > 0 ||
            reportErc20Holdings.length > 0 ||
            reportWalletScore) && (
            <Card className="bg-neutral-900 border-neutral-700 p-4 animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" /> AI REPORT SUMMARY
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAi ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    <span className="ml-2 text-neutral-400">Generating AI summary...</span>
                  </div>
                ) : aiSummary ? (
                  <p className="text-sm text-neutral-300 leading-relaxed">{aiSummary}</p>
                ) : (
                  <Button
                    onClick={generateAiSummary}
                    disabled={loadingAi}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Generate AI Summary
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {reportType === "specific_nft" && reportDetailedNftData?.nftMetadata && (
            <Card className="bg-neutral-900 border-neutral-700 p-4 animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-white" /> SPECIFIC NFT DETAILS
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center">
                  {reportDetailedNftData.nftMetadata.image_url ? (
                    <img
                      src={reportDetailedNftData.nftMetadata.image_url || "/placeholder.svg"}
                      alt={reportDetailedNftData.nftMetadata.collection_name}
                      className="w-full max-w-xs rounded object-cover border border-neutral-700"
                    />
                  ) : (
                    <div className="w-full max-w-xs h-48 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 text-sm border border-neutral-700">
                      No Image Available
                    </div>
                  )}
                  {reportDetailedNftData.nftPriceEstimate?.estimated_price_usd && (
                    <div className="mt-4 text-2xl font-bold text-white">
                      Est. Price: ${reportDetailedNftData.nftPriceEstimate.estimated_price_usd?.toFixed(2) || "N/A"}
                    </div>
                  )}
                  {reportDetailedNftData.nftPriceEstimate?.price_estimate_lower_bound &&
                    reportDetailedNftData.nftPriceEstimate?.price_estimate_upper_bound && (
                      <div className="text-sm text-neutral-400">
                        Range: ${reportDetailedNftData.nftPriceEstimate.price_estimate_lower_bound?.toFixed(2) || "N/A"}{" "}
                        - ${reportDetailedNftData.nftPriceEstimate.price_estimate_upper_bound?.toFixed(2) || "N/A"}
                      </div>
                    )}
                  {reportDetailedNftData.collectionAnalytics?.floor_price_usd && (
                    <div className="text-sm text-neutral-400">
                      Floor Price: ${reportDetailedNftData.collectionAnalytics.floor_price_usd?.toFixed(2) || "N/A"}
                    </div>
                  )}
                  {reportDetailedNftData.floor_vs_estimate_diff_percent !== null && (
                    <div className="text-sm text-neutral-400 flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Diff:{" "}
                      <span
                        className={
                          reportDetailedNftData.floor_vs_estimate_diff_percent >= 0 ? "text-green-500" : "text-red-500"
                        }
                      >
                        {reportDetailedNftData.floor_vs_estimate_diff_percent?.toFixed(2) || "N/A"}%
                      </span>
                    </div>
                  )}
                  <div className="mt-2 text-sm text-neutral-400 text-center">
                    Recommendation: <span className="text-orange-500">{reportDetailedNftData.recommendation}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">DESCRIPTION</h3>
                    <p className="text-sm text-neutral-300 leading-relaxed">
                      {reportDetailedNftData.nftMetadata.description || "No description available."}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">ATTRIBUTES</h3>
                    {Array.isArray(reportDetailedNftData.nftMetadata.attributes) &&
                    reportDetailedNftData.nftMetadata.attributes.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {reportDetailedNftData.nftMetadata.attributes.map((attr, idx) => (
                          <div key={idx} className="bg-neutral-800 p-2 rounded">
                            <span className="text-neutral-400">{attr.trait_type}:</span>{" "}
                            <span className="text-white">{attr.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-xs">No attributes found.</p>
                    )}
                  </div>
                  {reportDetailedNftData.nftScores?.rarity_score && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">RARITY SCORE</h3>
                      <p className="text-white font-mono text-lg">
                        {reportDetailedNftData.nftScores.rarity_score?.toFixed(2) || "N/A"}
                      </p>
                    </div>
                  )}
                  {reportDetailedNftData.nftPriceEstimate?.prediction_percentile && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">
                        PREDICTION PERCENTILE
                      </h3>
                      <p className="text-white font-mono text-lg">
                        {(reportDetailedNftData.nftPriceEstimate.prediction_percentile * 100)?.toFixed(2) || "N/A"}%
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "specific_nft" && reportDetailedNftData?.collectionMetadata && (
            <Card className="bg-neutral-900 border-neutral-700 p-4 animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-white" /> COLLECTION DETAILS
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center">
                  {reportDetailedNftData.collectionMetadata.image_url ? (
                    <img
                      src={reportDetailedNftData.collectionMetadata.image_url || "/placeholder.svg"}
                      alt={reportDetailedNftData.collectionMetadata.collection_name}
                      className="w-full max-w-xs rounded object-cover border border-neutral-700"
                    />
                  ) : (
                    <div className="w-full max-w-xs h-48 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 text-sm border border-neutral-700">
                      No Image Available
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">COLLECTION NAME</h3>
                    <p className="text-white text-lg font-bold">
                      {reportDetailedNftData.collectionMetadata.collection_name}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">DESCRIPTION</h3>
                    <p className="text-sm text-neutral-300 leading-relaxed">
                      {reportDetailedNftData.collectionMetadata.description || "No description available."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-neutral-800 p-2 rounded">
                      <span className="text-neutral-400">Total Supply:</span>{" "}
                      <span className="text-white">{reportDetailedNftData.collectionMetadata.total_supply}</span>
                    </div>
                    <div className="bg-neutral-800 p-2 rounded">
                      <span className="text-neutral-400">Contract:</span>{" "}
                      <span className="text-white font-mono truncate">
                        {reportDetailedNftData.collectionMetadata.contract_address}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "specific_nft" && reportDetailedNftData?.collectionAnalytics && (
            <Card className="bg-neutral-900 border-neutral-700 p-4 animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white" /> COLLECTION MARKET DATA
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">VOLUME (30D)</h3>
                  <p className="text-xl font-bold text-white font-mono">
                    ${reportDetailedNftData.collectionAnalytics.volume_usd?.toFixed(2) || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">VOLUME CHANGE (30D)</h3>
                  <p
                    className={`text-xl font-bold font-mono ${
                      (reportDetailedNftData.collectionAnalytics.volume_change_percentage || 0) >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {reportDetailedNftData.collectionAnalytics.volume_change_percentage?.toFixed(2) || "N/A"}%
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">FLOOR PRICE</h3>
                  <p className="text-xl font-bold text-white font-mono">
                    ${reportDetailedNftData.collectionAnalytics.floor_price_usd?.toFixed(2) || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">SALES (30D)</h3>
                  <p className="text-xl font-bold text-white font-mono">
                    {reportDetailedNftData.collectionAnalytics.sales || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">SALES CHANGE (30D)</h3>
                  <p
                    className={`text-xl font-bold font-mono ${
                      (reportDetailedNftData.collectionAnalytics.sales_change || 0) >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {reportDetailedNftData.collectionAnalytics.sales_change?.toFixed(2) || "N/A"}%
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">TRANSACTIONS (30D)</h3>
                  <p className="text-xl font-bold text-white font-mono">
                    {reportDetailedNftData.collectionAnalytics.transaction_count || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">UNIQUE BUYERS (30D)</h3>
                  <p className="text-xl font-bold text-white font-mono">
                    {reportDetailedNftData.collectionAnalytics.unique_buyers || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">UNIQUE SELLERS (30D)</h3>
                  <p className="text-xl font-bold text-white font-mono">
                    {reportDetailedNftData.collectionAnalytics.unique_sellers || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">ASSETS</h3>
                  <p className="text-xl font-bold text-white font-mono">
                    {reportDetailedNftData.collectionAnalytics.assets || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs text-neutral-400 tracking-wider mb-1">ASSETS CHANGE</h3>
                  <p
                    className={`text-xl font-bold font-mono ${
                      (reportDetailedNftData.collectionAnalytics.assets_change || 0) >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {reportDetailedNftData.collectionAnalytics.assets_change?.toFixed(2) || "N/A"}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "specific_nft" &&
            reportDetailedNftData?.collectionTrends &&
            reportDetailedNftData.collectionTrends.length > 0 && (
              <Card className="bg-neutral-900 border-neutral-700 p-4 animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-white" /> COLLECTION TRENDS (LAST 30 DAYS)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Volume Trend Chart */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white">Volume Trend</h3>
                    <ChartContainer
                      config={{
                        volume: {
                          label: "Volume",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-[200px] w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={reportDetailedNftData.collectionTrends}
                          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-700))" />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            className="text-xs text-neutral-400"
                          />
                          <YAxis
                            tickFormatter={(value) => (typeof value === "number" ? `$${value.toFixed(0)}` : "")}
                            tickLine={false}
                            axisLine={false}
                            className="text-xs text-neutral-400"
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  {/* Sales Trend Chart */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white">Sales Trend</h3>
                    <ChartContainer
                      config={{
                        sales: {
                          label: "Sales",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-[200px] w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={reportDetailedNftData.collectionTrends}
                          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-700))" />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            className="text-xs text-neutral-400"
                          />
                          <YAxis
                            tickFormatter={(value) => (typeof value === "number" ? value.toFixed(0) : "")}
                            tickLine={false}
                            axisLine={false}
                            className="text-xs text-neutral-400"
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  {/* Transactions Trend Chart */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white">Transactions Trend</h3>
                    <ChartContainer
                      config={{
                        transactions: {
                          label: "Transactions",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                      className="h-[200px] w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={reportDetailedNftData.collectionTrends}
                          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-700))" />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            className="text-xs text-neutral-400"
                          />
                          <YAxis
                            tickFormatter={(value) => (typeof value === "number" ? value.toFixed(0) : "")}
                            tickLine={false}
                            axisLine={false}
                            className="text-xs text-neutral-400"
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="transactions" stroke="var(--color-transactions)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  {/* Assets Trend Chart */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-white">Assets Trend</h3>
                    <ChartContainer
                      config={{
                        assets: {
                          label: "Assets",
                          color: "hsl(var(--chart-4))",
                        },
                      }}
                      className="h-[200px] w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={reportDetailedNftData.collectionTrends}
                          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-700))" />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            className="text-xs text-neutral-400"
                          />
                          <YAxis
                            tickFormatter={(value) => (typeof value === "number" ? value.toFixed(0) : "")}
                            tickLine={false}
                            axisLine={false}
                            className="text-xs text-neutral-400"
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="assets" stroke="var(--color-assets)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            )}

          {(reportType === "connected_wallet" || reportType === "specific_wallet") && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-4 bg-neutral-900 border-neutral-700 animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-white" /> NFT HOLDINGS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportNftHoldings.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {reportNftHoldings.map((nft) => (
                          <div
                            key={`${nft.contract_address}-${nft.token_id}`}
                            className="flex items-center gap-3 p-2 bg-neutral-800 rounded"
                          >
                            {nft.image_url ? (
                              <img
                                src={nft.image_url || "/placeholder.svg"}
                                alt={nft.collection_name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-neutral-700 rounded flex items-center justify-center text-xs text-neutral-400">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="text-xs text-white font-mono">{nft.collection_name}</div>
                              <div className="text-xs text-neutral-500">ID: {nft.token_id}</div>
                              {nft.price_estimate_usd && (
                                <div className="text-xs text-orange-500">
                                  Est: ${nft.price_estimate_usd?.toFixed(2) || "N/A"}
                                </div>
                              )}
                              {/* Simplified recommendation for wallet view */}
                              <div className="text-xs text-neutral-400">
                                Rec:{" "}
                                <span className="text-white">
                                  {getRecommendation(nft.price_estimate_usd, undefined)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-sm">No NFTs found in this wallet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-4 bg-neutral-900 border-neutral-700 animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-white" /> ERC20 HOLDINGS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportErc20Holdings.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {reportErc20Holdings.map((token, index) => (
                          <div
                            key={index}
                            className="text-xs border-l-2 border-orange-500 pl-3 hover:bg-neutral-800 p-2 rounded transition-colors"
                          >
                            <div className="text-neutral-500 font-mono">{token.token_symbol}</div>
                            <div className="text-white">
                              {token.quantity?.toFixed(4) || "N/A"}{" "}
                              <span className="text-orange-500 font-mono">{token.token_name}</span>
                              {token.usd_value && <span> (~${token.usd_value?.toFixed(2) || "N/A"})</span>}
                            </div>
                            <div className="text-xs text-neutral-400">
                              Rec: <span className="text-white">{getRecommendation(token.usd_value, undefined)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-sm">No ERC20 tokens found in this wallet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-4 bg-neutral-900 border-neutral-700 animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                      <Info className="w-4 h-4 text-white" /> WALLET SCORE
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    {reportWalletScore ? (
                      <>
                        <div className="relative w-32 h-32 mb-4">
                          <div className="absolute inset-0 border-2 border-white rounded-full opacity-60 animate-pulse"></div>
                          <div className="absolute inset-2 border border-white rounded-full opacity-40"></div>
                          <div className="absolute inset-4 border border-white rounded-full opacity-20"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-px bg-white opacity-30"></div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-px h-full bg-white opacity-30"></div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-orange-500">
                            {reportWalletScore.wallet_score?.toFixed(0) || "N/A"}
                          </div>
                        </div>

                        <div className="text-xs text-neutral-500 space-y-1 w-full font-mono">
                          <div className="flex justify-between">
                            <span>Classification:</span>
                            <span className="text-white">{reportWalletScore.classification || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Anomalous Pattern:</span>
                            <span className="text-white">
                              {reportWalletScore.anomalous_pattern_score?.toFixed(2) || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Risk Interaction:</span>
                            <span className="text-white">
                              {reportWalletScore.risk_interaction_score?.toFixed(2) || "N/A"}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-neutral-500 text-sm">Wallet score not available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Historical Price Charts for ERC20s */}
              {Object.keys(reportTokenHistoricalPrices).length > 0 && (
                <Card className="bg-neutral-900 border-neutral-700 p-4 animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-white" /> TOKEN HISTORICAL PRICES
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(reportTokenHistoricalPrices).map(([symbol, data]) => (
                      <div key={symbol} className="space-y-2">
                        <h3 className="text-sm font-medium text-white">{symbol} Price (Last 30 Days)</h3>
                        {data.length > 0 ? (
                          <ChartContainer
                            config={{
                              price: {
                                label: "Price",
                                color: "hsl(var(--chart-1))",
                              },
                            }}
                            className="h-[200px] w-full"
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-700))" />
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={(value) =>
                                    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                  }
                                  tickLine={false}
                                  axisLine={false}
                                  className="text-xs text-neutral-400"
                                />
                                <YAxis
                                  tickFormatter={(value) => (typeof value === "number" ? `$${value.toFixed(2)}` : "")}
                                  tickLine={false}
                                  axisLine={false}
                                  className="text-xs text-neutral-400"
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="price" stroke="var(--color-price)" dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        ) : (
                          <p className="text-neutral-500 text-xs">No historical data available for {symbol}.</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { z } from "zod"

const BITSCRUNCH_API_KEY = process.env.BITSCRUNCH_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// API endpoint configurations based on the provided documentation
const API_ENDPOINTS = {
  // Token Endpoints
  "token-balance": {
    url: "https://api.unleashnfts.com/api/v2/token/balance",
    params: ["blockchain", "address", "token_address"],
    description:
      "Get the token balances for a specific wallet address. Example: To get the balance of a specific token, provide both `address` and `token_address`.",
  },
  "token-metrics": {
    url: "https://api.unleashnfts.com/api/v2/token/metrics",
    params: ["blockchain", "token_address"],
    description: "Retrieve key metrics and metadata for a specific token. Example: Use this to get the current price, market cap, and holder count for a token like WETH.",
  },
  "token-price-prediction": {
    url: "https://api.unleashnfts.com/api/v2/token/price_prediction",
    params: ["token_address"],
    description: "Get a future price prediction for a token. Requires `token_address`.",
  },
  "token-dex-price": {
    url: "https://api.unleashnfts.com/api/v2/token/dex_price",
    params: ["blockchain", "token_address", "time_range"],
    description: "Get the current USD price of an ERC-20 token from DEXs. Example: Use this to find the real-time price of a token before making a trade.",
  },
  "token-historical-price": {
    url: "https://api.unleashnfts.com/api/v2/token/historical_price",
    params: ["blockchain", "token_address", "time_range"],
    description: "Retrieve the historical USD price of an ERC-20 token. Example: To get the price history for the last 30 days, use `time_range: '30d'`.",
  },
  // Wallet Endpoints
  "wallet-balance-nft": {
    url: "https://api.unleashnfts.com/api/v2/wallet/balance/nft",
    params: ["wallet", "blockchain"],
    description: "Get a comprehensive overview of a wallet's NFT holdings. Requires the `wallet` address.",
  },
  "wallet-balance-token": {
    url: "https://api.unleashnfts.com/api/v2/wallet/balance/token",
    params: ["address", "blockchain"],
    description: "Get a comprehensive overview of a wallet's ERC-20 token holdings. Requires the `address`.",
  },
  "wallet-score": {
    url: "https://api.unleashnfts.com/api/v2/wallet/score",
    params: ["wallet_address"],
    description: "Assess a wallet's activity, risk profile, and interaction patterns. Requires `wallet_address`.",
  },
  "wallet-metrics": {
    url: "https://api.unleashnfts.com/api/v2/wallet/metrics",
    params: ["blockchain", "wallet"],
    description: "Get a wallet's transactional activity, including volume, inflow/outflow, and age. Requires the `wallet` address.",
  },
  // NFT Endpoints
  "nft-metadata": {
    url: "https://api.unleashnfts.com/api/v2/nft/metadata",
    params: ["blockchain", "contract_address", "token_id"],
    description: "Retrieve the metadata for a specific NFT. Requires `contract_address` and `token_id`.",
  },
  "nft-analytics": {
    url: "https://api.unleashnfts.com/api/v2/nft/analytics?sort_by=sales",
    params: ["contract_address", "token_id", "blockchain", "sort_by"],
    description: "Get detailed analytics for a specific NFT. `sort_by` is required, defaults to 'sales'. Example: To see sales analytics for the last 24 hours, use `time_range: '24h'`.",
  },
  "nft-scores": {
    url: "https://api.unleashnfts.com/api/v2/nft/scores?sort_by=price_ceiling",
    params: ["contract_address", "token_id", "blockchain", "sort_by"],
    description: "Get performance scores for a specific NFT. `sort_by` is required, defaults to 'price_ceiling'. Example: Use this to find the rarity and popularity of a specific NFT.",
  },
  "nft-washtrade": {
    url: "https://api.unleashnfts.com/api/v2/nft/washtrade?sort_by=washtrade_volume",
    params: ["contract_address", "token_id", "blockchain", "sort_by"],
    description: "Detect and analyze wash trading for a specific NFT. `sort_by` is required, defaults to 'washtrade_volume'.",
  },
  "nft-top-deals": {
    url: "https://api.unleashnfts.com/api/v2/nft/top_deals?sort_by=deal_score",
    params: ["sort_by"],
    description: "Discover the best current deals for NFTs. `sort_by` is required, defaults to 'deal_score'. Use this when a user asks for investment advice or 'what to buy'.",
  },
  "nft-price-estimate": {
    url: "https://api.unleashnfts.com/api/v2/nft/liquify/price_estimate",
    params: ["blockchain", "contract_address", "token_id"],
    description: "Get a predicted price for a specific NFT. Requires `contract_address` and `token_id`. Crucial for buy/sell recommendations.",
  },
  // NFT Collection Endpoints
  "collection-metadata": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/metadata",
    params: ["blockchain", "slug_name", "contract_address"],
    description: "Retrieve metadata for an entire NFT collection. Requires `contract_address` or `slug_name`.",
  },
  "collection-owner": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/owner?sort_by=acquired_date",
    params: ["blockchain", "contract_address", "sort_by"],
    description: "Get a list of all NFT holders for a collection. `sort_by` is required, defaults to 'acquired_date'.",
  },
  "collection-analytics": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/analytics?sort_by=sales",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Get detailed analytics for a collection. `sort_by` is required, defaults to 'sales'. Example: To get sales data for the last week for a collection, use `sort_by: 'sales'` and `time_range: '7d'`.",
  },
  "collection-holders": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/holders?sort_by=holders",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Get detailed holder metrics for a collection. `sort_by` is required, defaults to 'holders'.",
  },
  "collection-scores": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/scores?sort_by=marketcap",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Get performance scores for a collection. `sort_by` is required, defaults to 'marketcap'. Use this to find the collection's market cap and average price.",
  },
  "collection-washtrade": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/washtrade?sort_by=washtrade_assets",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Analyze wash trading at the collection level. `sort_by` is required, defaults to 'washtrade_assets'.",
  },
  "collection-whales": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/whales?sort_by=nft_count",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Get insights into 'Whales' (large holders) within a collection. `sort_by` is required, defaults to 'nft_count'.",
  },
  "collection-floor-price": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/floor-price",
    params: ["blockchain", "contract_address"],
    description: "Retrieves the current floor price of an NFT collection. Requires `contract_address`. Crucial for buy/sell recommendations.",
  },
  "collection-price-estimate": {
    url: "https://api.unleashnfts.com/api/v2/nft/liquify/collection/price_estimate",
    params: ["blockchain", "contract_address"],
    description: "Retrieve a predicted price for an entire NFT collection. Requires `contract_address`.",
  },
  // Market & Marketplace Endpoints
  "market-insights-analytics": {
    url: "https://api.unleashnfts.com/api/v2/nft/market-insights/analytics",
    params: ["blockchain", "time_range"],
    description: "Get aggregated analytics for the entire NFT market. Example: Use `time_range: '24h'` for the latest market overview.",
  },
  "market-insights-holders": {
    url: "https://api.unleashnfts.com/api/v2/nft/market-insights/holders",
    params: ["blockchain", "time_range"],
    description: "Get aggregated holder metrics across the entire NFT market.",
  },
  "market-insights-traders": {
    url: "https://api.unleashnfts.com/api/v2/nft/market-insights/traders",
    params: ["blockchain", "time_range"],
    description: "Get aggregated trader metrics across the entire NFT market.",
  },
  "market-insights-washtrade": {
    url: "https://api.unleashnfts.com/api/v2/nft/market-insights/washtrade",
    params: ["blockchain", "time_range"],
    description: "Get aggregated wash trade metrics for the entire NFT market.",
  },
  "marketplace-analytics": {
    url: "https://api.unleashnfts.com/api/v2/nft/marketplace/analytics?sort_by=volume",
    params: ["blockchain", "time_range", "sort_by"],
    description: "Get detailed analytics for a specific NFT marketplace. `sort_by` is required, defaults to 'volume'.",
  },
  "marketplace-holders": {
    url: "https://api.unleashnfts.com/api/v2/nft/marketplace/holders?sort_by=holders",
    params: ["blockchain", "time_range", "sort_by"],
    description: "Get holder metrics for a specific NFT marketplace. `sort_by` is required, defaults to 'holders'.",
  },
  "marketplace-traders": {
    url: "https://api.unleashnfts.com/api/v2/nft/marketplace/traders?sort_by=traders",
    params: ["blockchain", "time_range", "sort_by"],
    description: "Get trader metrics for a specific NFT marketplace. `sort_by` is required, defaults to 'traders'.",
  },
}

const SUPPORTED_BLOCKCHAINS = [
  "atleta_olympia",
  "avalanche",
  "base",
  "berachain",
  "binance",
  "bitcoin",
  "ethereum",
  "full",
  "linea",
  "monad_testnet",
  "polygon",
  "polyhedra_testnet",
  "root",
  "solana",
  "somnia_testnet",
  "soneium",
  "unichain",
  "unichain_sepolia",
]

const BLOCKCHAIN_ALIASES: { [key: string]: string } = {
  eth: "ethereum",
  matic: "polygon",
  avax: "avalanche",
  bnb: "binance",
  bsc: "binance",
  sol: "solana",
  btc: "bitcoin",
}

const TIME_RANGES = ["15m", "24h", "7d", "30d", "90d", "all"]

// Zod Schemas for Validation
const generateDetailedReportSchema = z.object({
  contract_address: z.string({ required_error: "A contract_address is required for a detailed report." }),
  token_id: z.string().optional(),
  blockchain: z.string().optional(),
})

const queryNFTDataSchema = z.discriminatedUnion("endpoint", [
  z.object({ endpoint: z.literal("token-balance"), address: z.string(), token_address: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("token-metrics"), token_address: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("token-price-prediction"), token_address: z.string() }),
  z.object({ endpoint: z.literal("token-dex-price"), token_address: z.string(), time_range: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("token-historical-price"), token_address: z.string(), time_range: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("wallet-balance-nft"), wallet: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("wallet-balance-token"), address: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("wallet-score"), wallet_address: z.string() }),
  z.object({ endpoint: z.literal("wallet-metrics"), wallet: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("nft-metadata"), contract_address: z.string(), token_id: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("nft-analytics"), contract_address: z.string(), token_id: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("nft-scores"), contract_address: z.string(), token_id: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("nft-washtrade"), contract_address: z.string(), token_id: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("nft-top-deals"), sort_by: z.string().optional() }),
  z.object({ endpoint: z.literal("nft-price-estimate"), contract_address: z.string(), token_id: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-metadata"), contract_address: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-owner"), contract_address: z.string(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-analytics"), contract_address: z.string(), time_range: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-holders"), contract_address: z.string(), time_range: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-scores"), contract_address: z.string(), time_range: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-washtrade"), contract_address: z.string(), time_range: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-whales"), contract_address: z.string(), time_range: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-floor-price"), contract_address: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("collection-price-estimate"), contract_address: z.string(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("market-insights-analytics"), time_range: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("market-insights-holders"), time_range: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("market-insights-traders"), time_range: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("market-insights-washtrade"), time_range: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("marketplace-analytics"), time_range: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("marketplace-holders"), time_range: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
  z.object({ endpoint: z.literal("marketplace-traders"), time_range: z.string().optional(), sort_by: z.string().optional(), blockchain: z.string().optional() }),
])

function normalizeBlockchainName(blockchain: string): string {
  const normalized = blockchain.toLowerCase()
  if (BLOCKCHAIN_ALIASES[normalized]) {
    return BLOCKCHAIN_ALIASES[normalized]
  }
  if (SUPPORTED_BLOCKCHAINS.includes(normalized)) {
    return normalized
  }
  return "ethereum" // Default to ethereum if not found
}

function parseArrayString(str: string): string[] {
  if (!str || typeof str !== "string") return []
  // Remove outer curly braces and split by comma, then trim and remove quotes
  return str
    .replace(/^{|}$/g, "")
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
}

function processAndSummarizeData(rawData: any, endpoint: string): any {
  console.log("=== RAW API DATA ===")
  console.log(JSON.stringify(rawData, null, 2))
  console.log("===================")

  let dataToProcess = rawData
  if (rawData && typeof rawData === "object" && Array.isArray(rawData.data)) {
    if (rawData.data.length > 0) {
      // For endpoints that return a single main object in data[0]
      if (
        endpoint.includes("metadata") ||
        endpoint.includes("scores") ||
        endpoint.includes("price_estimate") ||
        endpoint.includes("floor-price") ||
        endpoint.includes("wallet-analytics") ||
        endpoint.includes("wallet-metrics") ||
        endpoint.includes("wallet-balance-defi") ||
        endpoint.includes("token-metrics") ||
        endpoint.includes("token-price-prediction") ||
        endpoint.includes("market-insights-analytics") ||
        endpoint.includes("market-insights-traders") ||
        endpoint.includes("market-insights-holders")
      ) {
        dataToProcess = rawData.data[0] || {}
      } else {
        dataToProcess = rawData.data
      }
    } else {
      dataToProcess = {}
    }
  } else if (rawData && typeof rawData === "object" && rawData.data === null) {
    dataToProcess = {}
  }

  let summary: any = {}
  let chartData: any[] | undefined = undefined // For token historical price
  let detailedData: any[] | undefined = undefined // For top deals
  let volumeChartData: any[] | undefined = undefined // For collection/market analytics
  let salesChartData: any[] | undefined = undefined // For collection/market analytics
  let transactionsChartData: any[] | undefined = undefined // For collection/market analytics
  let assetsChartData: any[] | undefined = undefined // For collection analytics
  let tradersChartData: any[] | undefined = undefined // For market traders
  let buyersChartData: any[] | undefined = undefined // For market traders
  let sellersChartData: any[] | undefined = undefined // For market traders
  let holdersChartData: any[] | undefined = undefined // For market holders
  let whalesChartData: any[] | undefined = undefined // For market holders

  try {
    if (endpoint.includes("marketplace-analytics")) {
      if (Array.isArray(dataToProcess) && dataToProcess.length > 0) {
        const totalVolume = dataToProcess.reduce((acc, mp) => acc + (parseFloat(mp.volume) || 0), 0)
        const totalSales = dataToProcess.reduce((acc, mp) => acc + (parseInt(mp.sales, 10) || 0), 0)
        const totalTransactions = dataToProcess.reduce((acc, mp) => acc + (parseInt(mp.transactions, 10) || 0), 0)
        const topMarketplace = dataToProcess.sort((a, b) => b.volume - a.volume)[0]

        summary = {
          total_marketplaces: dataToProcess.length,
          total_volume_usd: totalVolume,
          total_sales_count: totalSales,
          total_transactions: totalTransactions,
          top_marketplace_by_volume: topMarketplace.name,
          top_marketplace_volume: topMarketplace.volume,
        }
        detailedData = dataToProcess.map((mp) => ({
          marketplace: mp.name,
          volume_usd: parseFloat(mp.volume).toFixed(2),
          sales: mp.sales,
          transactions: mp.transactions,
          volume_change_percent: mp.volume_change?.toFixed(2),
        }))
      } else {
        summary = { message: "No marketplace analytics data available." }
      }
    } else if (endpoint.includes("analytics")) {
      if (Array.isArray(dataToProcess)) {
        // This path is for /nft/collection/analytics
        const latestData = dataToProcess[dataToProcess.length - 1] || {}
        summary = {
          volume: latestData.volume || "N/A",
          sales_count: latestData.sales || "N/A",
          floor_price: latestData.floor_price_usd || "N/A",
          market_cap: latestData.market_cap || "N/A",
          average_price: latestData.average_price || "N/A",
          timestamp: latestData.updated_at || "N/A",
          volume_change: latestData.volume_change || "N/A",
          sales_change: latestData.sales_change || "N/A",
          transactions_change: latestData.transactions_change || "N/A",
          assets_change: latestData.assets_change || "N/A",
        }

        const blockDates = parseArrayString(latestData.block_dates || "{}")
        const volumeTrend = parseArrayString(latestData.volume_trend || "{}").map(Number)
        const salesTrend = parseArrayString(latestData.sales_trend || "{}").map(Number)
        const transactionsTrend = parseArrayString(latestData.transactions_trend || "{}").map(Number)
        const assetsTrend = parseArrayString(latestData.assets_trend || "{}").map(Number)

        volumeChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: volumeTrend[i] || 0,
        }))
        salesChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: salesTrend[i] || 0,
        }))
        transactionsChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: transactionsTrend[i] || 0,
        }))
        assetsChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: assetsTrend[i] || 0,
        }))
      } else if (endpoint.includes("market-insights-analytics")) {
        const blockDates = parseArrayString(dataToProcess.block_dates || "{}")
        const salesTrend = parseArrayString(dataToProcess.sales_trend || "{}").map(Number)
        const transactionsTrend = parseArrayString(dataToProcess.transactions_trend || "{}").map(Number)
        const volumeTrend = parseArrayString(dataToProcess.volume_trend || "{}").map(Number)

        summary = {
          total_sales: dataToProcess.sales || "N/A",
          sales_change: dataToProcess.sales_change || "N/A",
          total_transactions: dataToProcess.transactions || "N/A",
          transactions_change: dataToProcess.transactions_change || "N/A",
          total_volume: dataToProcess.volume || "N/A",
          volume_change: dataToProcess.volume_change || "N/A",
        }

        volumeChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: volumeTrend[i] || 0,
        }))
        salesChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: salesTrend[i] || 0,
        }))
        transactionsChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: transactionsTrend[i] || 0,
        }))
      } else {
        summary = {
          volume: dataToProcess.volume || dataToProcess.total_volume || "N/A",
          sales_count: dataToProcess.sales_count || dataToProcess.total_sales || "N/A",
          floor_price: dataToProcess.floor_price || "N/A",
          market_cap: dataToProcess.market_cap || "N/A",
          average_price: dataToProcess.average_price || "N/A",
        }
      }
    } else if (endpoint.includes("holders")) {
      if (Array.isArray(dataToProcess)) {
        summary = {
          total_holders: rawData.pagination?.total_items || dataToProcess.length,
          sample_holders: dataToProcess
            .slice(0, 3)
            .map((h: any) => `${h.holder_address.substring(0, 6)}... (${h.nft_count} NFTs)`)
            .join(", "),
        }
      } else if (endpoint.includes("market-insights-holders")) {
        const blockDates = parseArrayString(dataToProcess.block_dates || "{}")
        const holdersTrend = parseArrayString(dataToProcess.holders_trend || "{}").map(Number)
        const holdersWhalesTrend = parseArrayString(dataToProcess.holders_whales_trend || "{}").map(Number)

        summary = {
          total_holders: dataToProcess.holders || "N/A",
          holders_change: dataToProcess.holders_change || "N/A",
          total_whales: dataToProcess.holders_whales || "N/A",
          whales_change: dataToProcess.holders_whales_change || "N/A",
        }

        holdersChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: holdersTrend[i] || 0,
        }))
        whalesChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: holdersWhalesTrend[i] || 0,
        }))
      } else {
        summary = {
          total_holders: dataToProcess.total_holders || "N/A",
          unique_holders: dataToProcess.unique_holders || "N/A",
        }
      }
    } else if (endpoint.includes("traders")) {
      if (Array.isArray(dataToProcess)) {
        summary = {
          total_traders: rawData.pagination?.total_items || dataToProcess.length,
          top_traders: dataToProcess
            .slice(0, 3)
            .map((t: any) => `${t.trader_address.substring(0, 6)}... (Vol: ${t.total_volume})`)
            .join(", "),
        }
      } else if (endpoint.includes("market-insights-traders")) {
        const blockDates = parseArrayString(dataToProcess.block_dates || "{}")
        const tradersTrend = parseArrayString(dataToProcess.traders_trend || "{}").map(Number)
        const tradersBuyersTrend = parseArrayString(dataToProcess.traders_buyers_trend || "{}").map(Number)
        const tradersSellersTrend = parseArrayString(dataToProcess.traders_sellers_trend || "{}").map(Number)

        summary = {
          total_traders: dataToProcess.traders || "N/A",
          traders_change: dataToProcess.traders_change || "N/A",
          total_buyers: dataToProcess.traders_buyers || "N/A",
          buyers_change: dataToProcess.traders_buyers_change || "N/A",
          total_sellers: dataToProcess.traders_sellers || "N/A",
          sellers_change: dataToProcess.traders_sellers_change || "N/A",
        }

        tradersChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: tradersTrend[i] || 0,
        }))
        buyersChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: tradersBuyersTrend[i] || 0,
        }))
        sellersChartData = blockDates.map((date: string, i: number) => ({
          date: new Date(date).toLocaleDateString(),
          value: tradersSellersTrend[i] || 0,
        }))
      } else {
        summary = {
          total_traders: dataToProcess.total_traders || "N/A",
        }
      }
    } else if (endpoint.includes("whales")) {
      const whaleData = Array.isArray(dataToProcess) ? dataToProcess[0] : dataToProcess
      summary = {
        unique_wallets: whaleData.unique_wallets || "N/A",
        whale_holders: whaleData.whale_holders || "N/A",
        buy_whales: whaleData.buy_whales || "N/A",
        sell_whales: whaleData.sell_whales || "N/A",
      }
    } else if (endpoint.includes("floor-price")) {
      summary = {
        floor_price: dataToProcess.floor_price || "N/A",
        currency: dataToProcess.currency || "ETH",
      }
    } else if (endpoint.includes("metadata")) {
      summary = {
        name: dataToProcess.collection || dataToProcess.name || "N/A",
        symbol: dataToProcess.symbol || "N/A",
        total_supply: dataToProcess.distinct_nft_count || dataToProcess.total_supply || "N/A",
        description: dataToProcess.description || "N/A",
        contract_address: dataToProcess.contract_address || "N/A",
        image_url: dataToProcess.image_url || "N/A",
        discord_url: dataToProcess.discord_url || "N/A",
        external_url: dataToProcess.external_url || "N/A",
      }
    } else if (endpoint.includes("scores")) {
      if (endpoint.includes("collection")) {
        // Collection scores
        const scoreData = Array.isArray(dataToProcess) ? dataToProcess[0] : dataToProcess
        summary = {
          marketcap: scoreData.marketcap || "N/A",
          price_avg: scoreData.price_avg || "N/A",
          price_ceiling: scoreData.price_ceiling || "N/A",
        }
      } else {
        // NFT scores
        const scoreData = Array.isArray(dataToProcess) ? dataToProcess[0] : dataToProcess
        summary = {
          rarity_score: scoreData.rarity_score || "N/A",
          popularity_score: scoreData.popularity_score || "N/A",
          overall_score: scoreData.token_score || "N/A",
        }
      }
    } else if (endpoint.includes("price_estimate")) {
      summary = {
        price_estimate: dataToProcess.price_estimate || dataToProcess.price || "N/A",
        confidence: dataToProcess.confidence || "N/A",
        currency: dataToProcess.currency || "ETH",
        token_id: dataToProcess.token_id || "N/A",
        contract_address: dataToProcess.contract_address || "N/A",
        blockchain: dataToProcess.blockchain || "N/A",
        collection_name: dataToProcess.collection_name || "N/A",
        rarity_sales: JSON.stringify(dataToProcess.rarity_sales || {}),
        collection_drivers: JSON.stringify(dataToProcess.collection_drivers || {}),
        nft_rarity_drivers: JSON.stringify(dataToProcess.nft_rarity_drivers || {}),
        nft_sales_drivers: JSON.stringify(dataToProcess.nft_sales_drivers || {}),
        prediction_percentile: dataToProcess.prediction_percentile || "N/A",
        thumbnail_url: dataToProcess.thumbnail_url || "N/A",
        token_image_url: dataToProcess.token_image_url || "N/A",
        price_estimate_lower_bound: dataToProcess.price_estimate_lower_bound || "N/A",
        price_estimate_upper_bound: dataToProcess.price_estimate_upper_bound || "N/A",
      }
    } else if (endpoint.includes("wallet-balance-defi")) {
      summary = {
        total_value: dataToProcess.total_value || "N/A",
        assets:
          dataToProcess.assets && Array.isArray(dataToProcess.assets)
            ? dataToProcess.assets.map((a: any) => `${a.name}: ${a.balance}`).join(", ")
            : "N/A",
      }
    } else if (endpoint.includes("wallet-balance-nft")) {
      if (Array.isArray(dataToProcess)) {
        summary = {
          total_nfts: rawData.pagination?.total_items || dataToProcess.length,
          sample_nfts: dataToProcess
            .slice(0, 3)
            .map((nft: any) => `${nft.collection_name || nft.name} #${nft.token_id}`)
            .join(", "),
        }
      } else {
        summary = { total_nfts: "N/A" }
      }
    } else if (endpoint.includes("wallet-balance-token")) {
      if (Array.isArray(dataToProcess)) {
        summary = {
          total_tokens: rawData.pagination?.total_items || dataToProcess.length,
          sample_tokens: dataToProcess
            .slice(0, 3)
            .map((t: any) => `${t.symbol}: ${t.balance}`)
            .join(", "),
        }
      } else {
        summary = { total_tokens: "N/A" }
      }
    } else if (endpoint.includes("nft-transactions")) {
      if (Array.isArray(dataToProcess)) {
        summary = {
          total_transactions: rawData.pagination?.total_items || dataToProcess.length,
          sample_transactions: dataToProcess
            .slice(0, 3)
            .map((tx: any) => `${tx.type} ${tx.price} ETH (Token: ${tx.token_id})`)
            .join(", "),
        }
      } else {
        summary = { total_transactions: "N/A" }
      }
    } else if (endpoint.includes("nft-top-deals")) {
      if (Array.isArray(dataToProcess)) {
        summary = {
          total_deals: rawData.pagination?.total_items || dataToProcess.length,
          top_deals: dataToProcess
            .slice(0, 3)
            .map(
              (deal: any) =>
                `${deal.collection_name} (Score: ${deal.deal_score?.toFixed(2) || "N/A"}, Listed: ${deal.listed_eth_price} ETH)`,
            )
            .join(", "),
        }
        detailedData = dataToProcess.map((deal: any) => ({
          collection_name: deal.collection_name,
          contract_address: deal.contract_address,
          blockchain: normalizeBlockchainName(deal.chain_id),
          deal_score: deal.deal_score,
          estimated_eth_price: deal.estimated_eth_price,
          listed_eth_price: deal.listed_eth_price,
          token_id: deal.token_id,
        }))
      } else {
        summary = { total_deals: "N/A" }
        detailedData = []
      }
    } else if (endpoint.includes("token-historical-price")) {
      if (Array.isArray(dataToProcess)) {
        chartData = dataToProcess.map((item: any) => ({
          date: new Date(item.block_date).toLocaleDateString(),
          price: item.usd,
        }))
        const firstPrice = chartData[0]?.price || "N/A"
        const lastPrice = chartData[chartData.length - 1]?.price || "N/A"
        summary = {
          price_range: `${firstPrice} USD to ${lastPrice} USD`,
          data_points: chartData.length,
        }
      } else {
        summary = { price_range: "N/A" }
      }
    } else if (endpoint.includes("token-metrics")) {
      summary = {
        current_price: dataToProcess.current_price || "N/A",
        market_cap: dataToProcess.market_cap || "N/A",
        holders: dataToProcess.holders || "N/A",
        token_score: dataToProcess.token_score || "N/A",
        risk_level: dataToProcess.risk_level || "N/A",
        token_name: dataToProcess.token_name || "N/A",
        token_symbol: dataToProcess.token_symbol || "N/A",
      }
    } else if (endpoint.includes("token-price-prediction")) {
      summary = {
        price_estimate: dataToProcess.price_estimate || "N/A",
        lower_bound: dataToProcess.price_estimate_lower_bound || "N/A",
        upper_bound: dataToProcess.price_estimate_upper_bound || "N/A",
        volatility_influence: dataToProcess.price_range_volatility_influence || "N/A",
        trading_volume_trend: dataToProcess.trading_volume_trend_influence || "N/A",
      }
    } else {
      const fallbackSummary: Record<string, any> = {}
      for (const key in dataToProcess) {
        if (Object.prototype.hasOwnProperty.call(dataToProcess, key)) {
          const value = dataToProcess[key]
          fallbackSummary[key] = typeof value === "object" && value !== null ? JSON.stringify(value) : value
        }
      }
      summary = fallbackSummary
    }

    console.log("=== PROCESSED SUMMARY ===")
    console.log(JSON.stringify(summary, null, 2))
    console.log("========================")

    return {
      summary,
      chartData,
      detailedData,
      volumeChartData,
      salesChartData,
      transactionsChartData,
      assetsChartData,
      tradersChartData,
      buyersChartData,
      sellersChartData,
      holdersChartData,
      whalesChartData,
    }
  } catch (error) {
    console.error("Error processing data:", error)
    return {
      summary: { error: "Failed to process data", raw_data_available: true },
      chartData: undefined,
      detailedData: undefined,
      volumeChartData: undefined,
      salesChartData: undefined,
      transactionsChartData: undefined,
      assetsChartData: undefined,
      tradersChartData: undefined,
      buyersChartData: undefined,
      sellersChartData: undefined,
      holdersChartData: undefined,
      whalesChartData: undefined,
    }
  }
}

async function callBitsCrunchAPI(endpoint: string, params: Record<string, string>) {
  const config = API_ENDPOINTS[endpoint as keyof typeof API_ENDPOINTS]
  if (!config) {
    throw new Error(`Unknown endpoint: ${endpoint}`)
  }

  const url = new URL(config.url)
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  console.log(`Calling BitsCrunch API URL: ${url.toString()}`)

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "x-api-key": BITSCRUNCH_API_KEY || "",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`BitsCrunch API error: ${response.status} ${response.statusText}`, errorText)
    throw new Error(`API call failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log(`BitsCrunch API response for endpoint ${endpoint}:`, JSON.stringify(data, null, 2))
  return data
}

// Store chat sessions in memory (in production, use Redis or database)
const chatSessions = new Map()

async function handleFunctionCall(functionCall: { name: string; args: Record<string, any> }) {
  const { name, args } = functionCall
  console.log(`Handling function call for: ${name} with args:`, JSON.stringify(args, null, 2))

  // VALIDATION STEP
  if (name === "generateDetailedReport") {
    const validation = generateDetailedReportSchema.safeParse(args)
    if (!validation.success) {
      const errorMessage = `Invalid parameters for generateDetailedReport: ${JSON.stringify(validation.error.flatten().fieldErrors)}`
      console.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  } else if (name === "queryNFTData") {
    const validation = queryNFTDataSchema.safeParse(args)
    if (!validation.success) {
      const errorMessage = `Invalid parameters for queryNFTData endpoint ${args.endpoint}: ${JSON.stringify(validation.error.flatten().fieldErrors)}`
      console.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }
  // END VALIDATION STEP

  if (name === "generateDetailedReport") {
    const { contract_address, token_id, blockchain } = args
    const isSpecificNft = !!token_id

    const apiCalls: { key: string; endpoint: string; params: any }[] = [
      { key: "collectionMetadata", endpoint: "collection-metadata", params: { contract_address, blockchain } },
      { key: "collectionAnalytics", endpoint: "collection-analytics", params: { contract_address, blockchain, time_range: "30d" } },
      { key: "collectionScores", endpoint: "collection-scores", params: { contract_address, blockchain, time_range: "30d" } },
      { key: "collectionWhales", endpoint: "collection-whales", params: { contract_address, blockchain, time_range: "30d" } },
    ]

    if (isSpecificNft) {
      apiCalls.push(
        { key: "nftMetadata", endpoint: "nft-metadata", params: { contract_address, token_id, blockchain } },
        { key: "nftPriceEstimate", endpoint: "nft-price-estimate", params: { contract_address, token_id, blockchain } },
        { key: "nftScores", endpoint: "nft-scores", params: { contract_address, token_id, blockchain } },
      )
    }

    const promises = apiCalls.map(call => callBitsCrunchAPI(call.endpoint, call.params).catch(e => ({ error: e.message, endpoint: call.endpoint })));
    const results = await Promise.all(promises);

    const aggregatedReportData: any = { isSpecificNft };
    results.forEach((result, index) => {
      const key = apiCalls[index].key;
      if (result && !result.error) {
        aggregatedReportData[key] = processAndSummarizeData(result, apiCalls[index].endpoint).summary;
      } else {
        console.error(`Error fetching data for ${key}:`, result.error);
      }
    });

    return {
      success: true,
      reportData: aggregatedReportData,
    }
  }

  if (name === "queryNFTData") {
    const { endpoint, ...params } = args
    try {
      const rawData = await callBitsCrunchAPI(endpoint, params)
      const processedData = processAndSummarizeData(rawData, endpoint)
      return {
        success: true,
        endpoint,
        parameters: params,
        data: processedData.summary,
        detailedData: processedData.detailedData,
        chartData: processedData.chartData,
        volumeChartData: processedData.volumeChartData,
        salesChartData: processedData.salesChartData,
        transactionsChartData: processedData.transactionsChartData,
        assetsChartData: processedData.assetsChartData,
        tradersChartData: processedData.tradersChartData,
        buyersChartData: processedData.buyersChartData,
        sellersChartData: processedData.sellersChartData,
        holdersChartData: processedData.holdersChartData,
        whalesChartData: processedData.whalesChartData,
      }
    } catch (error) {
      console.error(`Error fetching data for ${endpoint}:`, error)
      return {
        success: false,
        endpoint,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  return { success: false, error: `Unknown function call: ${name}` }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Chat API: Starting request processing")

    const { messages, sessionId = "default" } = await req.json()
    console.log("Chat API: Received messages:", messages?.length, "Session:", sessionId)

    if (!messages || !Array.isArray(messages)) {
      console.error("Chat API: Invalid messages format")
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      console.error("Chat API: Missing GEMINI_API_KEY")
      return NextResponse.json({ error: "Missing Gemini API key" }, { status: 500 })
    }

    if (!BITSCRUNCH_API_KEY) {
      console.error("Chat API: Missing BITSCRUNCH_API_KEY")
      return NextResponse.json({ error: "Missing BitsCrunch API key" }, { status: 500 })
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [{ functionDeclarations: [queryNFTDataFunction, generateDetailedReportFunction] }],
    })

    const systemPrompt = `You are an expert Web3 financial advisor and analytics assistant named "fin3Crunch AI". You have access to BitsCrunch APIs for comprehensive NFT/WEB3 data analysis.

**CRITICAL INSTRUCTION: TOOL USAGE**
- You MUST use the provided tools to answer any user query about NFT or token data.
- NEVER respond with placeholder text like "[This section will display data...]".
- Your final text response should only be generated AFTER all tool calls have been made and their results have been provided back to you.
- Your tool calls will be validated against a schema; if you receive a validation error, analyze it and correct your parameters for the next call.

**Tool Selection Guide:**
- For simple, direct questions about a single metric (e.g., "what's the floor price?", "get me the metadata"), use the \`queryNFTData\` tool with the most specific endpoint.
- For broad requests like "give me a detailed report", "full analysis", "tell me everything about...", or "should I buy this?", you MUST use the \`generateDetailedReport\` tool. This tool is optimized to gather all necessary data in one step.

**Example Scenarios (Few-Shot Learning):**

**Scenario 1: User asks for a detailed report on a collection.**
- **User Query:** "Can you give me a full analysis of the Bored Ape Yacht Club collection?"
- **Your Action (Single Tool Call):**
  1. \`generateDetailedReport({ contract_address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' })\`

**Scenario 2: User asks for investment advice on a specific NFT.**
- **User Query:** "Is BAYC #8817 a good buy right now?"
- **Your Action (Single Tool Call):**
  1. \`generateDetailedReport({ contract_address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', token_id: '8817' })\`

**Scenario 3: User asks for top deals.**
- **User Query:** "What are some good NFTs to invest in?"
- **Your Action (Single Tool Call):**
  1. \`queryNFTData({ endpoint: 'nft-top-deals', sort_by: 'deal_score' })\`

For investment or buy/sell recommendations:
- Use the \`generateDetailedReport\` tool to gather comprehensive data first.
- Then, compare the current floor price with the estimated price.
- If estimated price is significantly higher than current floor price, recommend BUY.
- If estimated price is significantly lower than current floor price, recommend SELL.
- If they are similar, recommend HOLD or NEUTRAL.
- Always provide a brief reason for your recommendation.
- Format your recommendation clearly, starting with "RECOMMENDATION: [BUY/SELL/HOLD/NEUTRAL] - [Reason]". This specific format is crucial for the frontend to display it correctly.

**Market Sentiment Analysis (Financial Advisor Role):**
- When providing data, especially from analytics endpoints, analyze the 'change' and 'trend' percentages/data.
- If volume, sales, or prices are consistently rising or have a significant positive 'change' percentage over a period, infer a 'bullish' sentiment.
- If volume, sales, or prices are consistently falling or have a significant negative 'change' percentage, infer a 'bearish' sentiment.
- If changes are minimal or mixed, infer a 'neutral' or 'stable' sentiment.
- Always explain *why* you've determined a certain sentiment, referencing the data (e.g., "The market appears bullish, with a 15% increase in volume over the last 24 hours.").
- Use your financial advisor persona to provide actionable insights based on the sentiment.
`

    let chat = chatSessions.get(sessionId)

    if (!chat) {
      const chatHistory = messages.slice(0, -1).map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }))

      chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          {
            role: "model",
            parts: [
              {
                text: "I understand. I'm your NFT/Web3 analytics assistant with access to BitsCrunch APIs. I will use the `generateDetailedReport` tool for comprehensive analyses and `queryNFTData` for specific metrics.",
              },
            ],
          },
          ...chatHistory,
        ],
      })

      chatSessions.set(sessionId, chat)
      console.log("Chat API: Created new chat session")
    }

    const lastMessage = messages[messages.length - 1]
    console.log("Chat API: Sending message to Gemini")

    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response

    console.log("Chat API: Gemini AI response received")

    let responseData = null
    let recommendationData = null
    let chartData = null
    let volumeChartData = null
    let salesChartData = null
    let transactionsChartData = null
    let assetsChartData = null
    let tradersChartData = null
    let buyersChartData = null
    let sellersChartData = null
    let holdersChartData = null
    let whalesChartData = null
    let reportData: any = null
    let finalText = response.text()

    const functionCalls = response.functionCalls()
    if (functionCalls && functionCalls.length > 0) {
      console.log("Chat API: Processing function calls")
      const functionCall = functionCalls[0] // Assuming one primary tool call for now
      const result = await handleFunctionCall(functionCall)

      if (result.success) {
        if (functionCall.name === 'generateDetailedReport') {
          reportData = result.reportData;
        } else {
          responseData = {
            metrics: result.data,
            endpoint: result.endpoint,
            parameters: functionCall.args,
            detailedData: result.detailedData,
          }
          chartData = result.chartData
          volumeChartData = result.volumeChartData
          salesChartData = result.salesChartData
          transactionsChartData = result.transactionsChartData
          assetsChartData = result.assetsChartData
          tradersChartData = result.tradersChartData
          buyersChartData = result.buyersChartData
          sellersChartData = result.sellersChartData
          holdersChartData = result.holdersChartData
          whalesChartData = result.whalesChartData
        }

        const summaryResult = await chat.sendMessage([
          {
            functionResponse: {
              name: functionCall.name,
              response: result,
            },
          },
        ])
        finalText = summaryResult.response.text()
      } else {
        const errorResult = await chat.sendMessage([
          {
            functionResponse: {
              name: functionCall.name,
              response: {
                success: false,
                error: result.error,
              },
            },
          },
        ])
        finalText = errorResult.response.text()
      }
    }

    const recommendationMatch = finalText.match(/RECOMMENDATION: (BUY|SELL|HOLD|NEUTRAL) - (.*)/i)
    if (recommendationMatch) {
      recommendationData = {
        type: recommendationMatch[1].toLowerCase() as "buy" | "sell" | "hold" | "neutral",
        message: recommendationMatch[2],
      }
      finalText = finalText.replace(recommendationMatch[0], "").trim()
    }

    console.log("Chat API: Sending response")

    return NextResponse.json({
      content: finalText,
      data: responseData,
      recommendation: recommendationData,
      chartData: chartData,
      volumeChartData: volumeChartData,
      salesChartData: salesChartData,
      transactionsChartData: transactionsChartData,
      assetsChartData: assetsChartData,
      tradersChartData: tradersChartData,
      buyersChartData: buyersChartData,
      sellersChartData: sellersChartData,
      holdersChartData: holdersChartData,
      whalesChartData,
      reportData: reportData,
    })
  } catch (error) {
    console.error("Chat API error:", error)

    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }

    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const BITSCRUNCH_API_KEY = process.env.BITSCRUNCH_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// API endpoint configurations based on the provided documentation
const API_ENDPOINTS = {
  // Token Endpoints
  "token-balance": {
    url: "https://api.unleashnfts.com/api/v2/token/balance",
    params: ["blockchain", "address", "token_address"],
    description: "Get the token balances for a specific wallet address.",
  },
  "token-metrics": {
    url: "https://api.unleashnfts.com/api/v2/token/metrics",
    params: ["blockchain", "token_address"],
    description: "Retrieve key metrics and metadata for a specific token.",
  },
  "token-price-prediction": {
    url: "https://api.unleashnfts.com/api/v2/token/price_prediction",
    params: ["token_address"],
    description: "Get a future price prediction for a token.",
  },
  "token-dex-price": {
    url: "https://api.unleashnfts.com/api/v2/token/dex_price",
    params: ["blockchain", "token_address", "time_range"],
    description: "Get the current USD price of an ERC-20 token from DEXs.",
  },
  "token-historical-price": {
    url: "https://api.unleashnfts.com/api/v2/token/historical_price",
    params: ["blockchain", "token_address", "time_range"],
    description: "Retrieve the historical USD price of an ERC-20 token.",
  },
  // Wallet Endpoints
  "wallet-balance-nft": {
    url: "https://api.unleashnfts.com/api/v2/wallet/balance/nft",
    params: ["wallet", "blockchain"],
    description: "Get a comprehensive overview of a wallet's NFT holdings.",
  },
  "wallet-balance-token": {
    url: "https://api.unleashnfts.com/api/v2/wallet/balance/token",
    params: ["address", "blockchain"],
    description: "Get a comprehensive overview of a wallet's ERC-20 token holdings.",
  },
  "wallet-score": {
    url: "https://api.unleashnfts.com/api/v2/wallet/score",
    params: ["wallet_address"],
    description: "Assess a wallet's activity, risk profile, and interaction patterns.",
  },
  "wallet-metrics": {
    url: "https://api.unleashnfts.com/api/v2/wallet/metrics",
    params: ["blockchain", "wallet"],
    description: "Get a wallet's transactional activity, including volume, inflow/outflow, and age.",
  },
  // NFT Endpoints
  "nft-metadata": {
    url: "https://api.unleashnfts.com/api/v2/nft/metadata",
    params: ["blockchain", "contract_address", "token_id"],
    description: "Retrieve the metadata for a specific NFT.",
  },
  "nft-analytics": {
    url: "https://api.unleashnfts.com/api/v2/nft/analytics?sort_by=sales",
    params: ["contract_address", "token_id", "blockchain", "sort_by"],
    description: "Get detailed analytics for a specific NFT. `sort_by` is required, defaults to 'sales'.",
  },
  "nft-scores": {
    url: "https://api.unleashnfts.com/api/v2/nft/scores?sort_by=price_ceiling",
    params: ["contract_address", "token_id", "blockchain", "sort_by"],
    description: "Get performance scores for a specific NFT. `sort_by` is required, defaults to 'price_ceiling'.",
  },
  "nft-washtrade": {
    url: "https://api.unleashnfts.com/api/v2/nft/washtrade?sort_by=washtrade_volume",
    params: ["contract_address", "token_id", "blockchain", "sort_by"],
    description: "Detect and analyze wash trading for a specific NFT. `sort_by` is required, defaults to 'washtrade_volume'.",
  },
  "nft-top-deals": {
    url: "https://api.unleashnfts.com/api/v2/nft/top_deals?sort_by=deal_score",
    params: ["sort_by"],
    description: "Discover the best current deals for NFTs. `sort_by` is required, defaults to 'deal_score'.",
  },
  "nft-price-estimate": {
    url: "https://api.unleashnfts.com/api/v2/nft/liquify/price_estimate",
    params: ["blockchain", "contract_address", "token_id"],
    description: "Get a predicted price for a specific NFT.",
  },
  // NFT Collection Endpoints
  "collection-metadata": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/metadata",
    params: ["blockchain", "slug_name", "contract_address"],
    description: "Retrieve metadata for an entire NFT collection.",
  },
  "collection-owner": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/owner?sort_by=acquired_date",
    params: ["blockchain", "contract_address", "sort_by"],
    description: "Get a list of all NFT holders for a collection. `sort_by` is required, defaults to 'acquired_date'.",
  },
  "collection-analytics": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/analytics?sort_by=sales",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Get detailed analytics for a collection. `sort_by` is required, defaults to 'sales'.",
  },
  "collection-holders": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/holders?sort_by=holders",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Get detailed holder metrics for a collection. `sort_by` is required, defaults to 'holders'.",
  },
  "collection-scores": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/scores?sort_by=marketcap",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Get performance scores for a collection. `sort_by` is required, defaults to 'marketcap'.",
  },
  "collection-washtrade": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/washtrade?sort_by=washtrade_assets",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Analyze wash trading at the collection level. `sort_by` is required, defaults to 'washtrade_assets'.",
  },
  "collection-whales": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/whales?sort_by=nft_count",
    params: ["blockchain", "contract_address", "time_range", "sort_by"],
    description: "Get insights into 'Whales' within a collection. `sort_by` is required, defaults to 'nft_count'.",
  },
  "collection-floor-price": {
    url: "https://api.unleashnfts.com/api/v2/nft/collection/floor-price",
    params: ["blockchain", "contract_address"],
    description: "Retrieves the current floor price of an NFT collection.",
  },
  "collection-price-estimate": {
    url: "https://api.unleashnfts.com/api/v2/nft/liquify/collection/price_estimate",
    params: ["blockchain", "contract_address"],
    description: "Retrieve a predicted price for an entire NFT collection.",
  },
  // Market & Marketplace Endpoints
  "market-insights-analytics": {
    url: "https://api.unleashnfts.com/api/v2/nft/market-insights/analytics",
    params: ["blockchain", "time_range"],
    description: "Get aggregated analytics for the entire NFT market.",
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
    if (endpoint.includes("analytics")) {
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
      if (Array.isArray(dataToProcess)) {
        summary = {
          total_whales: rawData.pagination?.total_items || dataToProcess.length,
          top_whales: dataToProcess
            .slice(0, 3)
            .map((w: any) => `${w.wallet_address.substring(0, 6)}... (${w.nft_count} NFTs)`)
            .join(", "),
        }
      } else {
        summary = {
          total_whales: dataToProcess.total_whales || "N/A",
        }
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
      if (Array.isArray(dataToProcess)) {
        const latestScore = dataToProcess[0] || {}
        summary = {
          rarity_score: latestScore.rarity_score || "N/A",
          popularity_score: latestScore.popularity_score || "N/A",
          overall_score: latestScore.token_score || "N/A",
          price: latestScore.price || "N/A",
        }
      } else {
        summary = {
          rarity_score: dataToProcess.rarity_score || "N/A",
          popularity_score: dataToProcess.popularity_score || "N/A",
          overall_score: dataToProcess.overall_score || "N/A",
        }
      }
    } else if (endpoint.includes("price_estimate")) {
      summary = {
        estimated_price: dataToProcess.estimated_price || dataToProcess.price || "N/A",
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

const nftQueryFunction = {
  name: "queryNFTData",
  description: "Query NFT or Token data using BitsCrunch APIs",
  parameters: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        enum: Object.keys(API_ENDPOINTS), // Dynamically get all endpoint names
        description: "The API endpoint to call",
      },
      blockchain: {
        type: "string",
        enum: SUPPORTED_BLOCKCHAINS,
        description: "Blockchain name (ethereum, polygon, avalanche, binance, solana, etc.)",
      },
      contract_address: {
        type: "string",
        description: "NFT collection contract address",
      },
      token_id: {
        type: "string",
        description: "Specific NFT token ID",
      },
      wallet_address: {
        type: "string",
        description: "The user's wallet address (e.g. 0x...). Use for endpoints like wallet-score, wallet-analytics.",
      },
      wallet: {
        type: "string",
        description: "The user's wallet address (e.g. 0x...). Note: Use this parameter name for 'wallet-metrics' and 'wallet-balance-nft' endpoints.",
      },
      address: {
        type: "string",
        description: "The user's wallet address (e.g. 0x...). Note: Use this parameter name for 'wallet-balance-token' and 'token-balance' endpoints.",
      },
      token_address: {
        type: "string",
        description: "ERC20 token address for token-specific queries",
      },
      time_range: {
        type: "string",
        enum: ["15m", "24h", "7d", "30d", "90d", "all"],
        description: "Time range for analytics",
      },
      limit: {
        type: "number",
        description: "Number of items to return for paginated results (e.g., holders, transactions)",
      },
      offset: {
        type: "number",
        description: "Offset for pagination",
      },
      threshold: {
        type: "number",
        description: "Minimum NFTs to be considered a whale",
      },
      type: {
        type: "string",
        enum: ["buy", "sell", "mint", "transfer"], // Example types, adjust as per actual API
        description: "Type of transaction (buy, sell, mint, transfer)",
      },
      sort_by: {
        type: "string",
        description:
          "Field to sort results by (e.g., 'deal_score', 'rarity_score', 'volume_usd', 'balance', 'timestamp')",
      },
      sort_order: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort order (ascending or descending)",
      },
    },
    required: ["endpoint"],
  },
}

// Store chat sessions in memory (in production, use Redis or database)
const chatSessions = new Map()

async function handleFunctionCall(endpoint: string, args: Record<string, any>) {
  console.log(`Handling function call for endpoint: ${endpoint} with args:`, JSON.stringify(args, null, 2))
  try {
    const rawData = await callBitsCrunchAPI(endpoint, args)
    const processedData = processAndSummarizeData(rawData, endpoint)
    return {
      success: true,
      endpoint,
      parameters: args,
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
      model: "gemini-2.5-flash",
      tools: [{ functionDeclarations: [nftQueryFunction] }],
    })

    const systemPrompt = `You are an expert Web3 financial advisor and analytics assistant named "fin3Crunch AI". You have access to BitsCrunch APIs for comprehensive NFT/WEB3 data analysis.

You have been provided with comprehensive API documentation. You must analyze it to select the most appropriate endpoints and parameters for the user's query. Pay close attention to required parameters like \`sort_by\` and use the documented default values if the user does not specify a sorting preference. When a user asks about suspicious activity or wash trading, you must use the \`nft-washtrade\` or \`collection-washtrade\` endpoints. If the API returns no wash trading data for the requested timeframe (e.g., 24h), you should inform the user that no activity was detected and suggest they try a longer timeframe, such as '7d' or '30d', to get a broader view. For any endpoint that returns trend data (e.g., \`sales_trend\`, \`volume_trend\`, \`washtrade_assets_trend\`), you must process this data to be displayed as a chart.

IMPORTANT PARAMETER RULES:
- The API uses different parameter names for wallet addresses depending on the endpoint. Be very careful and always use the correct one:
  - Use \`wallet_address\` for endpoints like \`wallet-score\`, \`wallet-analytics\`, etc.
  - Use \`wallet\` for \`wallet-metrics\` and \`wallet-balance-nft\`.
  - Use \`address\` for \`wallet-balance-token\` and \`token-balance\`.
- For collection-specific endpoints, use "contract_address".
- For token-specific endpoints, use "token_address".
- Common aliases: eth=ethereum, matic=polygon, avax=avalanche, bnb/bsc=binance, sol=solana, btc=bitcoin.
- Always refer to the function tool schema for the correct parameter name for each endpoint.

When a user asks about NFT or Token data:
1. Determine which API endpoint is most appropriate.
2. **Proactive Suggestions:** If a user asks for general NFT investment advice, "what to buy", or "good NFTs to invest in" without specifying a collection, proactively use the \`nft-top-deals\` endpoint to show them current opportunities. This is more helpful than asking them to be more specific.
3. Extract required parameters from their query.
4. If you have previously provided a list of items (e.g., top deals, collections) and the user asks for more details about one of those items, first check your conversation history for the contract_address and blockchain of that specific item. If found, use those details directly without asking the user again.
5. If required parameters are missing and not found in history, ask the user to provide them.
6. Use the queryNFTData function to fetch the data.
7. Present the results in a clear, user-friendly format.

When a user asks for a "detailed report" or "full analysis" for an NFT collection or token:
- Identify the blockchain and contract_address (for NFT collection) or token_address (for token).
- Make multiple calls to queryNFTData to gather comprehensive data:
    - For NFT Collection Report:
        - 'collection-metadata' (for name, symbol, description, image)
        - 'collection-analytics' (for volume, sales, floor price trends - use '30d' time_range for charts)
        - 'collection-scores' (for rarity, popularity, overall scores)
        - 'price_estimate' (for individual NFT price estimate if token_id is provided)
        - 'liquify-collection-price-estimate' (for collection price estimate)
        - 'collection-holders' (for holder distribution)
        - 'collection-traders' (for trader activity)
        - 'collection-whales' (for whale insights)
    - For Token Report:
        - 'token-metrics' (for current price, market cap, holders, score)
        - 'token-historical-price' (for price chart - use '30d' or '90d' time_range)
        - 'token-price-prediction' (for estimated price range)
- Aggregate all this data into a single response structure.
- Indicate in your response that a detailed report is being generated and will be displayed.

For investment or buy/sell recommendations for NFTs:
- If a user asks "Should I invest in X NFT?" or "Is X NFT a good buy/sell?", first fetch the current floor price using 'collection-floor-price' and then the estimated price using 'price_estimate' (for individual NFTs) or 'liquify-collection-price-estimate' (for collections).
- Compare the current floor price with the estimated price.
- If estimated price is significantly higher than current floor price, recommend BUY.
- If estimated price is significantly lower than current floor price, recommend SELL.
- If they are similar, recommend HOLD or NEUTRAL.
- Always provide a brief reason for your recommendation.
- Format your recommendation clearly, starting with "RECOMMENDATION: [BUY/SELL/HOLD/NEUTRAL] - [Reason]". This specific format is crucial for the frontend to display it correctly.

For investment or buy/sell recommendations for Tokens:
- If a user asks "Should I invest in X Token?" or "Is X Token a good buy/sell?", first fetch the current price using 'token-metrics' and then the estimated price using 'token-price-prediction'.
- Compare the current price with the predicted price.
- If predicted price is significantly higher than current price, recommend BUY.
- If predicted price is significantly lower than current price, recommend SELL.
- If they are similar, recommend HOLD or NEUTRAL.
- Always provide a brief reason for your recommendation.
- Format your recommendation clearly, starting with "RECOMMENDATION: [BUY/SELL/HOLD/NEUTRAL] - [Reason]". This specific format is crucial for the frontend to display it correctly.

When asked for historical price data for a token, use 'token-historical-price' and mention that a chart will be displayed.

**Market Sentiment Analysis (Financial Advisor Role):**
- When providing data, especially from analytics endpoints (e.g., 'collection-analytics', 'market-insights-analytics', 'market-insights-traders', 'market-insights-holders'), analyze the 'change' and 'trend' percentages/data.
- If volume, sales, or prices are consistently rising or have a significant positive 'change' percentage over a period, infer a 'bullish' sentiment.
- If volume, sales, or prices are consistently falling or have a significant negative 'change' percentage, infer a 'bearish' sentiment.
- If changes are minimal or mixed, infer a 'neutral' or 'stable' sentiment.
- Always explain *why* you've determined a certain sentiment, referencing the data (e.g., "The market appears bullish, with a 15% increase in volume over the last 24 hours.").
- Use your financial advisor persona to provide actionable insights based on the sentiment.

**Interactive Button Suggestions:**
- When you need specific input from the user that can be chosen from a predefined list (e.g., blockchain, time range, type of market insight), phrase your question clearly and list the options.
- For example, instead of "What blockchain?", say "Which blockchain are you interested in? (e.g., Ethereum, Polygon, Solana)".
- For time ranges, say "What time range would you like? (e.g., 24h, 7d, 30d)".
- For market insights, say "What kind of market insights are you looking for? (e.g., Holders, Traders, Analytics)".
- The frontend will parse these options and present them as buttons. Do not include special formatting for the buttons, just list the options clearly in your natural language response.
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
                text: "I understand. I'm your NFT/Web3 analytics assistant with access to BitsCrunch APIs. I'll help you analyze NFT/Web3 data, provide investment insights, and maintain context throughout our conversation.",
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
    let chartData = null // For token historical price
    let volumeChartData = null // For collection/market analytics
    let salesChartData = null // For collection/market analytics
    let transactionsChartData = null // For collection/market analytics
    let assetsChartData = null // For collection analytics
    let tradersChartData = null // For market traders
    let buyersChartData = null // For market traders
    let sellersChartData = null // For market traders
    let holdersChartData = null // For market holders
    let whalesChartData = null // For market holders
    let reportData = null // For aggregated detailed reports
    let finalText = response.text()

    const functionCalls = response.functionCalls()
    if (functionCalls && functionCalls.length > 0) {
      console.log("Chat API: Processing function calls")

      // Handle multiple function calls for a report
      const isDetailedReportRequest =
        lastMessage.content.toLowerCase().includes("detailed report") ||
        lastMessage.content.toLowerCase().includes("full analysis")

      if (isDetailedReportRequest && functionCalls.length > 1) {
        reportData = {}
        for (const functionCall of functionCalls) {
          if (functionCall.name === "queryNFTData" && functionCall.args.endpoint) {
            const result = await handleFunctionCall(functionCall.args.endpoint, functionCall.args)
            if (result.success) {
              // Aggregate data based on endpoint
              if (result.endpoint.includes("metadata")) {
                reportData.metadata = result.data
              } else if (result.endpoint.includes("analytics")) {
                reportData.analytics = result.data
                reportData.volumeChartData = result.volumeChartData
                reportData.salesChartData = result.salesChartData
                reportData.transactionsChartData = result.transactionsChartData
                reportData.assetsChartData = result.assetsChartData
              } else if (result.endpoint.includes("scores")) {
                reportData.scores = result.data
              } else if (result.endpoint.includes("price_estimate")) {
                reportData.priceEstimate = result.data
              } else if (result.endpoint.includes("token-metrics")) {
                reportData.tokenMetrics = result.data
              } else if (result.endpoint.includes("token-historical-price")) {
                reportData.historicalPrice = result.data
                reportData.chartData = result.chartData
              } else if (result.endpoint.includes("token-price-prediction")) {
                reportData.pricePrediction = result.data
              } else if (result.endpoint.includes("holders")) {
                reportData.holders = result.data
                reportData.holdersChartData = result.holdersChartData
                reportData.whalesChartData = result.whalesChartData
              } else if (result.endpoint.includes("traders")) {
                reportData.traders = result.data
                reportData.tradersChartData = result.tradersChartData
                reportData.buyersChartData = result.buyersChartData
                reportData.sellersChartData = result.sellersChartData
              }
            } else {
              console.error(`Error fetching data for report: ${result.error}`)
            }
          }
        }
        // Send aggregated report data back to Gemini for final text generation
        const reportSummaryForGemini = `Aggregated report data: ${JSON.stringify(reportData, null, 2)}`
        const summaryResult = await chat.sendMessage([
          {
            functionResponse: {
              name: "queryNFTData", // Use a generic name for the aggregated response
              response: {
                success: true,
                summary: reportSummaryForGemini,
                report_data: reportData, // Send structured report data
              },
            },
          },
        ])
        finalText = summaryResult.response.text()
      } else {
        // Existing single function call handling
        for (const functionCall of functionCalls) {
          if (functionCall.name === "queryNFTData" && functionCall.args.endpoint) {
            const result = await handleFunctionCall(functionCall.args.endpoint, functionCall.args)

            if (result.success) {
              responseData = {
                metrics: result.data,
                endpoint: result.endpoint,
                parameters: functionCall.args, // Correctly pass args
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

              const dataSummaryForGemini = `Data fetched successfully from ${result.endpoint}:
Summary: ${JSON.stringify(result.data, null, 2)}
Detailed items: ${JSON.stringify(result.detailedData, null, 2)}`

              const summaryResult = await chat.sendMessage([
                {
                  functionResponse: {
                    name: functionCall.name,
                    response: {
                      success: true,
                      summary: dataSummaryForGemini,
                      endpoint: result.endpoint,
                      detailed_items: result.detailedData,
                    },
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
                      endpoint: result.endpoint,
                    },
                  },
                },
              ])
              finalText = errorResult.response.text()
            }
          }
        }
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
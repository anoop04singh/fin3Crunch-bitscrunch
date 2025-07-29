import { type NextRequest, NextResponse } from "next/server"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { endpoint, walletAddress, params } = await req.json()
  // IMPORTANT: Replace 'YOUR_BITSCRUNCH_API_KEY' with your actual key
  // and set it as an environment variable in Vercel (e.g., BITSCRUNCH_API_KEY)
  const BITSCRUNCH_API_KEY = process.env.BITSCRUNCH_API_KEY || "1846c8cf79dc4cd8bd5a38ef707b7ace"

  // walletAddress is not strictly required for /nft/metadata, /nft/collection/metadata, /nft/liquify/price_estimate, etc.
  // Only enforce if it's a wallet-specific endpoint.
  const walletEndpoints = ["/wallet/balance/nft", "/wallet/balance/token", "/token/balance", "/wallet/score"]
  if (walletEndpoints.includes(endpoint) && !walletAddress) {
    return NextResponse.json({ error: "Wallet address is required for this endpoint" }, { status: 400 })
  }

  const baseUrl = "https://api.unleashnfts.com/api/v2"
  let url = `${baseUrl}${endpoint}`

  const queryParams = new URLSearchParams()
  queryParams.append("blockchain", "ethereum") // As per requirement, always Ethereum

  // Append required parameters based on the endpoint
  if (endpoint === "/wallet/balance/nft") {
    queryParams.append("wallet", walletAddress)
    queryParams.append("time_range", "all")
    queryParams.append("limit", "30")
  } else if (endpoint === "/wallet/balance/token" || endpoint === "/token/balance") {
    queryParams.append("address", walletAddress)
    queryParams.append("time_range", "all")
    queryParams.append("limit", "30")
  } else if (endpoint === "/wallet/score") {
    queryParams.append("wallet_address", walletAddress)
    queryParams.append("time_range", "all")
    queryParams.append("limit", "30")
  } else if (endpoint === "/nft/metadata") {
    if (!params.contract_address && !params.slug_name) {
      console.error("Missing contract_address or slug_name for /nft/metadata")
      return NextResponse.json(
        { error: "contract_address or slug_name is required for /nft/metadata" },
        { status: 400 },
      )
    }
    if (params.contract_address) queryParams.append("contract_address", params.contract_address)
    if (params.slug_name) queryParams.append("slug_name", params.slug_name)
    if (params.token_id) queryParams.append("token_id", params.token_id)
    queryParams.append("time_range", params.time_range || "all")
    queryParams.append("sort_order", params.sort_order || "desc")
    queryParams.append("offset", params.offset || "0")
    queryParams.append("limit", params.limit || "30")
  } else if (endpoint === "/nft/collection/metadata") {
    if (!params.contract_address && !params.slug_name) {
      console.error("Missing contract_address or slug_name for /nft/collection/metadata")
      return NextResponse.json(
        { error: "contract_address or slug_name is required for /nft/collection/metadata" },
        { status: 400 },
      )
    }
    if (params.contract_address) queryParams.append("contract_address", params.contract_address)
    if (params.slug_name) queryParams.append("slug_name", params.slug_name)
    queryParams.append("time_range", params.time_range || "all")
    queryParams.append("sort_order", params.sort_order || "desc")
    queryParams.append("offset", params.offset || "0")
    queryParams.append("limit", params.limit || "30")
  } else if (endpoint === "/nft/collection/analytics") {
    if (!params.contract_address && !params.slug_name) {
      console.error("Missing contract_address or slug_name for /nft/collection/analytics")
      return NextResponse.json(
        { error: "contract_address or slug_name is required for /nft/collection/analytics" },
        { status: 400 },
      )
    }
    if (params.contract_address) queryParams.append("contract_address", params.contract_address)
    if (params.slug_name) queryParams.append("slug_name", params.slug_name)
    queryParams.append("time_range", params.time_range || "24h")
    queryParams.append("sort_by", params.sort_by || "sales")
    queryParams.append("sort_order", params.sort_order || "desc")
    queryParams.append("offset", params.offset || "0")
    queryParams.append("limit", params.limit || "30")
  } else if (endpoint === "/nft/market-insights/analytics") {
    queryParams.append("time_range", params.time_range || "24h")
  } else if (endpoint === "/nft/liquify/price_estimate") {
    if (!params.contract_address || !params.token_id) {
      console.error("Missing contract_address or token_id for /nft/liquify/price_estimate")
      return NextResponse.json(
        { error: "contract_address and token_id are required for /nft/liquify/price_estimate" },
        { status: 400 },
      )
    }
    queryParams.append("contract_address", params.contract_address)
    queryParams.append("token_id", params.token_id)
  } else if (endpoint === "/nft/scores") {
    if (!params.contract_address && !params.slug_name) {
      console.error("Missing contract_address or slug_name for /nft/scores")
      return NextResponse.json({ error: "contract_address or slug_name is required for /nft/scores" }, { status: 400 })
    }
    if (params.contract_address) queryParams.append("contract_address", params.contract_address)
    if (params.slug_name) queryParams.append("slug_name", params.slug_name)
    if (params.token_id) queryParams.append("token_id", params.token_id)
    queryParams.append("time_range", params.time_range || "24h")
    queryParams.append("sort_by", params.sort_by || "price_ceiling")
    queryParams.append("sort_order", params.sort_order || "desc")
    queryParams.append("offset", params.offset || "0")
    queryParams.append("limit", params.limit || "30")
  } else if (endpoint === "/nft/collection/scores") {
    if (!params.contract_address && !params.slug_name) {
      console.error("Missing contract_address or slug_name for /nft/collection/scores")
      return NextResponse.json(
        { error: "contract_address or slug_name is required for /nft/collection/scores" },
        { status: 400 },
      )
    }
    if (params.contract_address) queryParams.append("contract_address", params.contract_address)
    if (params.slug_name) queryParams.append("slug_name", params.slug_name)
    queryParams.append("time_range", params.time_range || "24h")
    queryParams.append("sort_by", params.sort_by || "marketcap")
    queryParams.append("sort_order", params.sort_order || "desc")
    queryParams.append("offset", params.offset || "0")
    queryParams.append("limit", params.limit || "30")
  } else if (endpoint === "/nft/analytics") {
    if (!params.contract_address && !params.slug_name) {
      console.error("Missing contract_address or slug_name for /nft/analytics")
      return NextResponse.json(
        { error: "contract_address or slug_name is required for /nft/analytics" },
        { status: 400 },
      )
    }
    if (params.contract_address) queryParams.append("contract_address", params.contract_address)
    if (params.slug_name) queryParams.append("slug_name", params.slug_name)
    if (params.token_id) queryParams.append("token_id", params.token_id)
    queryParams.append("time_range", params.time_range || "24h")
    queryParams.append("sort_by", params.sort_by || "sales")
    queryParams.append("sort_order", params.sort_order || "desc")
    queryParams.append("offset", params.offset || "0")
    queryParams.append("limit", params.limit || "30")
  } else if (endpoint === "/nft/collection/whales") {
    if (!params.contract_address && !params.slug_name) {
      console.error("Missing contract_address or slug_name for /nft/collection/whales")
      return NextResponse.json(
        { error: "contract_address or slug_name is required for /nft/collection/whales" },
        { status: 400 },
      )
    }
    if (params.contract_address) queryParams.append("contract_address", params.contract_address)
    if (params.slug_name) queryParams.append("slug_name", params.slug_name)
    queryParams.append("time_range", params.time_range || "24h")
    queryParams.append("sort_by", params.sort_by || "nft_count")
    queryParams.append("sort_order", params.sort_order || "desc")
    queryParams.append("offset", params.offset || "0")
    queryParams.append("limit", params.limit || "30")
  } else if (endpoint === "/token/historical_price") {
    if (!params.token_address || !params.time_range || !params.interval) {
      console.error("Missing token_address, time_range, or interval for /token/historical_price")
      return NextResponse.json(
        { error: "token_address, time_range, and interval are required for /token/historical_price" },
        { status: 400 },
      )
    }
    queryParams.append("token_address", params.token_address)
    queryParams.append("time_range", params.time_range)
    queryParams.append("interval", params.interval)
  } else if (endpoint === "/token/dex_price") {
    if (!params.token_address) {
      console.error("Missing token_address for /token/dex_price")
      return NextResponse.json({ error: "token_address is required for /token/dex_price" }, { status: 400 })
    }
    queryParams.append("token_address", params.token_address)
  }

  // Merge any additional parameters provided in the request body
  if (params) {
    for (const key in params) {
      // Avoid re-appending blockchain if already set
      if (key === "blockchain" && queryParams.has("blockchain")) continue
      // Avoid re-appending wallet/address/wallet_address if already set
      if (
        (key === "wallet" || key === "address" || key === "wallet_address") &&
        (queryParams.has("wallet") || queryParams.has("address") || queryParams.has("wallet_address"))
      )
        continue
      // Only append if not already handled by specific endpoint logic
      if (!queryParams.has(key)) {
        queryParams.append(key, params[key])
      }
    }
  }

  url = `${url}?${queryParams.toString()}`

  console.log(`Calling UnleashNFTs API: ${url}`)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": BITSCRUNCH_API_KEY,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      let errorDetails
      const errorResponse = response.clone()
      try {
        // Try to parse as JSON first
        errorDetails = await errorResponse.json()
      } catch (e) {
        // If that fails, it's likely not JSON, so read as text
        errorDetails = await response.text()
      }
      console.error(`UnleashNFTs API error for ${endpoint} (Status: ${response.status}):`, errorDetails)
      return NextResponse.json(
        { error: `Failed to fetch data from UnleashNFTs API: ${response.statusText}`, details: errorDetails },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching from UnleashNFTs API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
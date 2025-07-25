import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

export const maxDuration = 300 // Allow longer duration for AI generation

export async function POST(req: NextRequest) {
  const { reportData, promptType } = await req.json()

  // IMPORTANT: Set your GEMINI_API_KEY as an environment variable in Vercel
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 })
  }

  // Explicitly create a Google provider instance with the API key
  const google = createGoogleGenerativeAI({
    apiKey: GEMINI_API_KEY,
  })

  let prompt = ""
  const systemPrompt =
    "You are an expert financial analyst and blockchain specialist. Provide concise, professional, and actionable insights."

  switch (promptType) {
    case "wallet_summary":
      prompt = `Analyze the following wallet data and provide a concise summary of its holdings, risk profile, and overall financial standing. Highlight key strengths and weaknesses.
        Wallet Address: ${reportData.walletAddress}
        NFT Holdings: ${JSON.stringify(reportData.nftHoldings.map((nft: any) => ({ name: nft.collection_name, id: nft.token_id, price_estimate_usd: nft.price_estimate_usd })))}
        ERC20 Holdings: ${JSON.stringify(reportData.erc20Holdings.map((token: any) => ({ symbol: token.token_symbol, quantity: token.quantity, usd_value: token.usd_value })))}
        Wallet Score: ${JSON.stringify(reportData.walletScore)}
        Total Asset Value: $${reportData.totalAssetsValue.toFixed(2)}
        `
      break
    case "nft_recommendation":
      prompt = `Based on the following NFT metadata and estimated price, provide a buy/sell recommendation. Consider rarity, attributes, and current market estimate. If the price estimate is low or high, suggest why.
        NFT Name: ${reportData.collection_name}
        Token ID: ${reportData.token_id}
        Description: ${reportData.description}
        Image URL: ${reportData.image_url}
        Rarity Score: ${reportData.rarity_score}
        Estimated Price (USD): ${reportData.price_estimate_usd}
        Attributes: ${JSON.stringify(reportData.attributes)}
        `
      break
    case "token_recommendation":
      prompt = `Based on the following token data and historical prices, provide a buy/sell recommendation. Analyze the trend and suggest potential actions.
        Token Symbol: ${reportData.token_symbol}
        Token Name: ${reportData.token_name}
        Current Quantity: ${reportData.quantity}
        Current USD Value: ${reportData.usd_value}
        Historical Prices (Date, Price): ${JSON.stringify(reportData.historicalPrices.map((p: any) => ({ date: p.date, price: p.price })))}
        `
      break
    case "market_analytics_summary":
      const formatChange = (change: any) => {
        const num = parseFloat(change)
        if (isNaN(num)) return "N/A"
        return `${(num * 100).toFixed(2)}%`
      }
      prompt = `As a financial advisor, analyze the following 24-hour NFT market analytics data. Provide a concise market summary and an analysis of the market sentiment.
      - IMPORTANT: The entire response must be very concise, limited to a maximum of 3-4 lines.
      - Base your sentiment (bullish, bearish, neutral) on the change percentages (e.g., volume_change, sales_change).
      - Explain your reasoning clearly. For example, "The market appears bullish due to a significant 15% increase in sales volume."
      - Keep the tone professional and insightful.
      
      Data:
      - Total Volume (USD): ${reportData.volume?.toFixed(2) ?? "N/A"} (Change: ${formatChange(reportData.volume_change)})
      - Total Sales: ${reportData.sales ?? "N/A"} (Change: ${formatChange(reportData.sales_change)})
      - Total Transactions: ${reportData.transactions ?? "N/A"} (Change: ${formatChange(reportData.transactions_change)})
      `
      break
    default:
      return NextResponse.json({ error: "Invalid prompt type" }, { status: 400 })
  }

  console.log(`Calling Gemini AI for prompt type: ${promptType}`)
  try {
    const { text } = await generateText({
      model: google("models/gemini-1.5-flash-latest"), // Using a fast model for quick responses
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.7, // Adjust for creativity vs. factualness
    })
    console.log(`Gemini AI response for ${promptType}:`, text)
    return NextResponse.json({ summary: text })
  } catch (error) {
    console.error("Error generating AI text:", error)
    return NextResponse.json({ error: "Failed to generate AI summary", details: error }, { status: 500 })
  }
}
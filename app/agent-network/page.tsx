"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, Sparkles, MessageSquare, Users, BarChart, LineChartIcon, FileText } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { MarketMetrics } from "@/components/market-metrics"
import { useAppContext } from "@/app/context/AppContext"

interface Message {
  role: "user" | "assistant"
  content: string
  data?: any // To hold structured API response data
  recommendation?: { type: "buy" | "sell" | "hold" | "neutral"; message: string }
  chartData?: { date: string; price: number }[] // For token historical price
  volumeChartData?: { date: string; value: number }[] // For collection/market analytics
  salesChartData?: { date: string; value: number }[] // For collection/market analytics
  transactionsChartData?: { date: string; value: number }[] // For collection/market analytics
  assetsChartData?: { date: string; value: number }[] // For collection analytics
  tradersChartData?: { date: string; value: number }[] // For market traders
  buyersChartData?: { date: string; value: number }[] // For market traders
  sellersChartData?: { date: string; value: number }[] // For market traders
  holdersChartData?: { date: string; value: number }[] // For market holders
  whalesChartData?: { date: string; value: number }[] // For market holders
  reportData?: any // For aggregated detailed reports
}

const SUPPORTED_BLOCKCHAINS = ["ethereum", "polygon", "avalanche", "binance", "solana", "bitcoin", "base", "linea"] // A subset for buttons
const TIME_RANGES = ["24h", "7d", "30d", "90d", "all"]
const MARKET_INSIGHT_TYPES = ["Holders", "Traders", "Analytics"]

export default function AgentNetworkPage() {
  const { walletAddress, blockchain, agentNetworkState, setAgentNetworkState } = useAppContext()
  const { messages, marketAnalytics, marketSummary, isLoading, error } = agentNetworkState

  // Local state for UI controls
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [contractAddressInput, setContractAddressInput] = useState("")
  const [tokenIdInput, setTokenIdInput] = useState("")
  const [showDetailedReportInput, setShowDetailedReportInput] = useState(false)
  const [dynamicButtons, setDynamicButtons] = useState<string[]>([])
  const [dynamicButtonType, setDynamicButtonType] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Only fetch initial analytics if they haven't been fetched yet
    if (marketAnalytics === null) {
      const fetchAnalyticsAndSummary = async () => {
        setAgentNetworkState((prev) => ({ ...prev, isLoading: true, error: null }))
        try {
          // Fetch analytics
          const analyticsRes = await fetch("/api/bitscrunch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: "/nft/market-insights/analytics",
              params: { blockchain: "ethereum", time_range: "24h" },
            }),
          })
          const analyticsData = await analyticsRes.json()
          if (!analyticsRes.ok) throw new Error(analyticsData.error || "Failed to fetch market analytics")

          const processedData = analyticsData.data?.[0] || null

          // Generate summary with Gemini
          let summaryText = null
          if (processedData) {
            const summaryRes = await fetch("/api/gemini", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reportData: processedData,
                promptType: "market_analytics_summary",
              }),
            })
            const summaryData = await summaryRes.json()
            if (!summaryRes.ok) throw new Error(summaryData.error || "Failed to generate market summary")
            summaryText = summaryData.summary
          }

          setAgentNetworkState((prev) => ({
            ...prev,
            marketAnalytics: processedData,
            marketSummary: summaryText,
            isLoading: false,
          }))
        } catch (err: any) {
          console.error("Error fetching market data:", err)
          setAgentNetworkState((prev) => ({
            ...prev,
            isLoading: false,
            error: `Market Analytics Error: ${err.message}`,
          }))
        }
      }

      fetchAnalyticsAndSummary()
    }
  }, [marketAnalytics, setAgentNetworkState])

  const parseBotMessageForButtons = (messageContent: string) => {
    const lowerCaseContent = messageContent.toLowerCase()
    let buttons: string[] = []
    let type: string | null = null

    if (lowerCaseContent.includes("blockchain")) {
      buttons = SUPPORTED_BLOCKCHAINS
      type = "blockchain"
    } else if (lowerCaseContent.includes("time range") || lowerCaseContent.includes("timelines")) {
      buttons = TIME_RANGES
      type = "time_range"
    } else if (lowerCaseContent.includes("market insights")) {
      buttons = MARKET_INSIGHT_TYPES.map((t) => `Market insights on ${t}`)
      type = "market_insight_type"
    }

    setDynamicButtons(buttons)
    setDynamicButtonType(type)
  }

  const generateSuggestions = (lastBotMessage: Message) => {
    const newSuggestions: string[] = []

    newSuggestions.push("Show me top NFT deals")
    newSuggestions.push("What is the market sentiment for NFTs?")
    newSuggestions.push("Explain NFT rarity scores")
    newSuggestions.push("What are the current market analytics for Ethereum?")

    if (lastBotMessage.data?.endpoint?.includes("top-deals")) {
      if (lastBotMessage.data.detailedData && lastBotMessage.data.detailedData.length > 0) {
        const firstDeal = lastBotMessage.data.detailedData[0]
        newSuggestions.push(
          `Give me a detailed report for ${firstDeal.collection_name} NFT with ID ${firstDeal.token_id}`,
        )
        setContractAddressInput(firstDeal.contract_address)
        setTokenIdInput(firstDeal.token_id)
        setShowDetailedReportInput(true)
      }
    } else if (lastBotMessage.data?.endpoint?.includes("collection-metadata")) {
      const contract = lastBotMessage.data.metrics?.contract_address
      if (contract) {
        newSuggestions.push(`Show me analytics for ${lastBotMessage.data.metrics.name}`)
        newSuggestions.push(`Who are the top holders of ${lastBotMessage.data.metrics.name}?`)
        setContractAddressInput(contract)
        setShowDetailedReportInput(true)
      }
    } else if (lastBotMessage.data?.endpoint?.includes("token-metrics")) {
      const tokenAddress = lastBotMessage.data.parameters?.token_address
      if (tokenAddress) {
        newSuggestions.push(`Show historical price for ${lastBotMessage.data.metrics.token_symbol}`)
        newSuggestions.push(`Should I buy ${lastBotMessage.data.metrics.token_symbol}?`)
      }
    }

    setSuggestions(newSuggestions.slice(0, 5))
  }

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() && !showDetailedReportInput) return

    let finalMessageContent = messageContent
    if (showDetailedReportInput) {
      if (contractAddressInput && tokenIdInput) {
        finalMessageContent = `Generate detailed report for NFT with contract address ${contractAddressInput} and token ID ${tokenIdInput}.`
      } else if (contractAddressInput) {
        finalMessageContent = `Generate detailed report for collection with contract address ${contractAddressInput}.`
      }
    }

    let messageWithContext = finalMessageContent
    if (walletAddress) {
      messageWithContext = `CONTEXT: The user has connected wallet ${walletAddress} on the ${blockchain} network. Please use this for any relevant queries.\n\nUSER QUERY: ${finalMessageContent}`
    }

    const userMessage: Message = { role: "user", content: finalMessageContent }
    const currentMessages = [...messages, userMessage]

    setAgentNetworkState((prev) => ({ ...prev, messages: currentMessages, isLoading: true, error: null }))
    setInput("")
    setSuggestions([])
    setDynamicButtons([])
    setDynamicButtonType(null)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages.map(m => ({...m, content: m.role === 'user' && walletAddress ? `CONTEXT: The user has connected wallet ${walletAddress} on the ${blockchain} network. Please use this for any relevant queries.\n\nUSER QUERY: ${m.content}` : m.content})) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch AI response")
      }

      const data = await response.json()
      console.log("Received data from API:", data)

      const botMessage: Message = {
        role: "assistant",
        content: data.content,
        data: data.data,
        recommendation: data.recommendation,
        chartData: data.chartData,
        volumeChartData: data.volumeChartData,
        salesChartData: data.salesChartData,
        transactionsChartData: data.transactionsChartData,
        assetsChartData: data.assetsChartData,
        tradersChartData: data.tradersChartData,
        buyersChartData: data.buyersChartData,
        sellersChartData: data.sellersChartData,
        holdersChartData: data.holdersChartData,
        whalesChartData: data.whalesChartData,
        reportData: data.reportData,
      }
      setAgentNetworkState((prev) => ({ ...prev, messages: [...prev.messages, botMessage], isLoading: false }))
      generateSuggestions(botMessage)
      parseBotMessageForButtons(botMessage.content)
    } catch (err: any) {
      console.error("Error sending message:", err)
      setAgentNetworkState((prev) => ({ ...prev, error: err.message || "An unexpected error occurred.", isLoading: false }))
    } finally {
      setShowDetailedReportInput(false)
      setContractAddressInput("")
      setTokenIdInput("")
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    handleSendMessage(suggestion)
  }

  const handleDynamicButtonClick = (buttonText: string) => {
    let messageToSend = buttonText
    if (buttonText.startsWith("Market insights on ")) {
      messageToSend = `Market insights on ${buttonText.replace("Market insights on ", "").toLowerCase()}`
    }
    handleSendMessage(messageToSend)
  }

  const handleDirectReportSubmit = () => {
    if (contractAddressInput) {
      handleSendMessage("")
    } else {
      setAgentNetworkState((prev) => ({ ...prev, error: "Please enter at least a contract address for the report." }))
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-neutral-950 to-black animate-fade-in">
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-bold text-teal-100 tracking-wider">fin3Crunch AI</h1>
        <p className="text-sm text-neutral-400">Your intelligent Web3 analytics companion</p>
      </div>

      <MarketMetrics analytics={marketAnalytics} summary={marketSummary} loading={isLoading && marketAnalytics === null} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={cn("flex items-start gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-200 flex items-center justify-center text-zinc-900">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[70%] p-3 rounded-lg shadow-md",
                msg.role === "user"
                  ? "bg-teal-100 text-zinc-900 rounded-br-none"
                  : "bg-neutral-800 text-neutral-200 rounded-bl-none",
              )}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>

              {msg.recommendation && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600 text-neutral-100">
                  <CardContent className="p-3 text-xs">
                    <div className="font-bold uppercase mb-1">RECOMMENDATION: {msg.recommendation.type}</div>
                    <div>{msg.recommendation.message}</div>
                  </CardContent>
                </Card>
              )}

              {msg.chartData && msg.chartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <LineChartIcon className="w-3 h-3" /> Historical Price Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        price: {
                          label: "Price",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                  </CardContent>
                </Card>
              )}

              {msg.volumeChartData && msg.volumeChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <BarChart className="w-3 h-3" /> Volume Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Volume",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.volumeChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {msg.salesChartData && msg.salesChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <BarChart className="w-3 h-3" /> Sales Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Sales",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.salesChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {msg.transactionsChartData && msg.transactionsChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <BarChart className="w-3 h-3" /> Transactions Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Transactions",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.transactionsChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {msg.assetsChartData && msg.assetsChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <BarChart className="w-3 h-3" /> Assets Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Assets",
                          color: "hsl(var(--chart-4))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.assetsChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {msg.tradersChartData && msg.tradersChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Traders Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Traders",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.tradersChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {msg.buyersChartData && msg.buyersChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Buyers Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Buyers",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.buyersChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {msg.sellersChartData && msg.sellersChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Sellers Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Sellers",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.sellersChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {msg.holdersChartData && msg.holdersChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Holders Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Holders",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.holdersChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
              {msg.whalesChartData && msg.whalesChartData.length > 0 && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Whales Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[150px] w-full">
                    <ChartContainer
                      config={{
                        value: {
                          label: "Whales",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.whalesChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-600))" />
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
                          <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {msg.reportData && (
                <Card className="mt-3 bg-neutral-700 border-neutral-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Detailed Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-neutral-300 space-y-2">
                    {msg.reportData.metadata && (
                      <div>
                        <h4 className="font-bold text-teal-100">Collection Metadata:</h4>
                        <p>Name: {msg.reportData.metadata.name}</p>
                        <p>Description: {msg.reportData.metadata.description}</p>
                        <p>Total Supply: {msg.reportData.metadata.total_supply}</p>
                        {msg.reportData.metadata.image_url && (
                          <img
                            src={msg.reportData.metadata.image_url || "/placeholder.svg"}
                            alt="Collection"
                            className="w-16 h-16 rounded mt-2"
                          />
                        )}
                      </div>
                    )}
                    {msg.reportData.priceEstimate && (
                      <div>
                        <h4 className="font-bold text-teal-100">Price Estimate:</h4>
                        <p>Estimated Price: ${msg.reportData.priceEstimate.estimated_price?.toFixed(2) || "N/A"}</p>
                        <p>
                          Lower Bound: ${msg.reportData.priceEstimate.price_estimate_lower_bound?.toFixed(2) || "N/A"}
                        </p>
                        <p>
                          Upper Bound: ${msg.reportData.priceEstimate.price_estimate_upper_bound?.toFixed(2) || "N/A"}
                        </p>
                        <p>
                          Prediction Percentile:{" "}
                          {(msg.reportData.priceEstimate.prediction_percentile * 100)?.toFixed(2) || "N/A"}%
                        </p>
                      </div>
                    )}
                    {msg.reportData.analytics && (
                      <div>
                        <h4 className="font-bold text-teal-100">Collection Analytics:</h4>
                        <p>Volume (30D): ${msg.reportData.analytics.volume?.toFixed(2) || "N/A"}</p>
                        <p>Sales (30D): {msg.reportData.analytics.sales_count || "N/A"}</p>
                        <p>Floor Price: ${msg.reportData.analytics.floor_price?.toFixed(2) || "N/A"}</p>
                        {msg.reportData.volumeChartData && msg.reportData.volumeChartData.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium text-neutral-400">Volume Chart:</h5>
                            <ChartContainer
                              config={{ value: { label: "Volume", color: "hsl(var(--chart-1))" } }}
                              className="h-[100px] w-full"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={msg.reportData.volumeChartData}>
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide />
                                  <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </div>
                        )}
                        {msg.reportData.salesChartData && msg.reportData.salesChartData.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium text-neutral-400">Sales Chart:</h5>
                            <ChartContainer
                              config={{ value: { label: "Sales", color: "hsl(var(--chart-2))" } }}
                              className="h-[100px] w-full"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={msg.reportData.salesChartData}>
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide />
                                  <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.reportData.scores && (
                      <div>
                        <h4 className="font-bold text-teal-100">Scores:</h4>
                        <p>Rarity Score: {msg.reportData.scores.rarity_score || "N/A"}</p>
                        <p>Popularity Score: {msg.reportData.scores.popularity_score || "N/A"}</p>
                        <p>Overall Score: {msg.reportData.scores.overall_score || "N/A"}</p>
                      </div>
                    )}
                    {msg.reportData.holders && (
                      <div>
                        <h4 className="font-bold text-teal-100">Holders Insights:</h4>
                        <p>Total Holders: {msg.reportData.holders.total_holders || "N/A"}</p>
                        <p>Sample Holders: {msg.reportData.holders.sample_holders || "N/A"}</p>
                        {msg.reportData.holdersChartData && msg.reportData.holdersChartData.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium text-neutral-400">Holders Trend:</h5>
                            <ChartContainer
                              config={{ value: { label: "Holders", color: "hsl(var(--chart-1))" } }}
                              className="h-[100px] w-full"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={msg.reportData.holdersChartData}>
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide />
                                  <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.reportData.traders && (
                      <div>
                        <h4 className="font-bold text-teal-100">Traders Insights:</h4>
                        <p>Total Traders: {msg.reportData.traders.total_traders || "N/A"}</p>
                        <p>Top Traders: {msg.reportData.traders.top_traders || "N/A"}</p>
                        {msg.reportData.tradersChartData && msg.reportData.tradersChartData.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium text-neutral-400">Traders Trend:</h5>
                            <ChartContainer
                              config={{ value: { label: "Traders", color: "hsl(var(--chart-1))" } }}
                              className="h-[100px] w-full"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={msg.reportData.tradersChartData}>
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide />
                                  <Line type="monotone" dataKey="value" stroke="var(--color-value)" dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-200">
                <MessageSquare className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-teal-100" />
            <span className="ml-2 text-neutral-400">fin3Crunch AI is thinking...</span>
          </div>
        )}
        {error && <div className="text-red-500 text-center py-4">Error: {error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 pt-4 bg-neutral-900 border-t border-neutral-700">
        {suggestions.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(s)}
                className="border-teal-200 text-teal-200 hover:bg-teal-200 hover:text-zinc-900 transition-colors text-xs"
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        {dynamicButtons.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {dynamicButtons.map((s, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleDynamicButtonClick(s)}
                className="border-teal-200 text-teal-200 hover:bg-teal-200 hover:text-zinc-900 transition-colors text-xs"
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowDetailedReportInput(!showDetailedReportInput)}
            className="w-full border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent"
          >
            {showDetailedReportInput ? "Hide Direct Report Input" : "Generate Detailed Report (Direct Input)"}
          </Button>
        </div>

        {showDetailedReportInput && (
          <Card className="bg-neutral-800 border-neutral-700 p-4 mb-4 animate-fade-in">
            <CardContent className="space-y-3 p-0">
              <div>
                <label htmlFor="contract-address" className="block text-xs text-neutral-400 mb-1">
                  NFT Contract Address
                </label>
                <Input
                  id="contract-address"
                  placeholder="e.g., 0xbd3531da5cf5857e7cfaa92426877b022e612cf8"
                  value={contractAddressInput}
                  onChange={(e) => setContractAddressInput(e.target.value)}
                  className="bg-neutral-900 border-neutral-600 text-white placeholder-neutral-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor="token-id" className="block text-xs text-neutral-400 mb-1">
                  NFT Token ID (Optional for Collection Report)
                </label>
                <Input
                  id="token-id"
                  placeholder="e.g., 45"
                  value={tokenIdInput}
                  onChange={(e) => setTokenIdInput(e.target.value)}
                  className="bg-neutral-900 border-neutral-600 text-white placeholder-neutral-500 text-sm"
                />
              </div>
              <Button
                onClick={handleDirectReportSubmit}
                disabled={isLoading || !contractAddressInput}
                className="w-full bg-teal-200 hover:bg-teal-100 text-zinc-900"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                {isLoading ? "Generating Report..." : "Generate Report"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Ask fin3Crunch AI anything about Web3..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleSendMessage(input)
              }
            }}
            className="flex-1 bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSendMessage(input)}
            disabled={isLoading || (!input.trim() && !showDetailedReportInput)}
            className="bg-teal-200 hover:bg-teal-100 text-zinc-900"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Send,
  Sparkles,
  Users,
  BarChart,
  LineChartIcon,
  ChevronDown,
} from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { MarketMetrics } from "@/components/market-metrics"
import { useAppContext } from "@/app/context/AppContext"

interface Message {
  role: "user" | "assistant"
  content: string
  data?: any
  recommendation?: { type: "buy" | "sell" | "hold" | "neutral"; message: string }
  chartData?: { date: string; price: number }[]
  volumeChartData?: { date: string; value: number }[]
  salesChartData?: { date: string; value: number }[]
  transactionsChartData?: { date: string; value: number }[]
  assetsChartData?: { date: string; value: number }[]
  tradersChartData?: { date: string; value: number }[]
  buyersChartData?: { date: string; value: number }[]
  sellersChartData?: { date: string; value: number }[]
  holdersChartData?: { date: string; value: number }[]
  whalesChartData?: { date: string; value: number }[]
  reportData?: any
}

const SUPPORTED_BLOCKCHAINS = ["ethereum", "polygon", "avalanche", "binance", "solana", "bitcoin", "base", "linea"]
const TIME_RANGES = ["24h", "7d", "30d", "90d", "all"]
const MARKET_INSIGHT_TYPES = ["Holders", "Traders", "Analytics"]

export default function AgentNetworkPage() {
  const { walletAddress, blockchain, agentNetworkState, setAgentNetworkState } = useAppContext()
  const { messages, marketAnalytics, marketSummary, isLoading, error } = agentNetworkState

  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [dynamicButtons, setDynamicButtons] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isChatExpanded) {
      scrollToBottom()
    }
  }, [messages, isChatExpanded])

  useEffect(() => {
    if (marketAnalytics === null) {
      const fetchAnalyticsAndSummary = async () => {
        setAgentNetworkState((prev) => ({ ...prev, isLoading: true, error: null }))
        try {
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
    if (lowerCaseContent.includes("blockchain")) setDynamicButtons(SUPPORTED_BLOCKCHAINS)
    else if (lowerCaseContent.includes("time range")) setDynamicButtons(TIME_RANGES)
    else if (lowerCaseContent.includes("market insights"))
      setDynamicButtons(MARKET_INSIGHT_TYPES.map((t) => `Market insights on ${t}`))
    else setDynamicButtons([])
  }

  const generateSuggestions = (lastBotMessage: Message) => {
    const newSuggestions = [
      "Show me top NFT deals",
      "What is the market sentiment for NFTs?",
      "Explain NFT rarity scores",
    ]
    if (lastBotMessage.data?.endpoint?.includes("top-deals") && lastBotMessage.data.detailedData?.length > 0) {
      const firstDeal = lastBotMessage.data.detailedData[0]
      newSuggestions.push(`Tell me more about ${firstDeal.collection_name} #${firstDeal.token_id}`)
    }
    setSuggestions(newSuggestions)
  }

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return

    const userMessage: Message = { role: "user", content: messageContent }
    const currentMessages = [...messages, userMessage]

    setAgentNetworkState((prev) => ({ ...prev, messages: currentMessages, isLoading: true, error: null }))
    setInput("")
    setSuggestions([])
    setDynamicButtons([])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({
            ...m,
            content:
              m.role === "user" && walletAddress
                ? `CONTEXT: The user has connected wallet ${walletAddress} on the ${blockchain} network.\n\nUSER QUERY: ${m.content}`
                : m.content,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch AI response")
      }

      const data = await response.json()
      const botMessage: Message = { role: "assistant", ...data }
      setAgentNetworkState((prev) => ({ ...prev, messages: [...prev.messages, botMessage], isLoading: false }))
      generateSuggestions(botMessage)
      parseBotMessageForButtons(botMessage.content)
    } catch (err: any) {
      console.error("Error sending message:", err)
      setAgentNetworkState((prev) => ({ ...prev, error: err.message || "An unexpected error occurred.", isLoading: false }))
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    handleSendMessage(suggestion)
  }

  return (
    <div className="relative h-screen flex flex-col">
      {/* Main content area, scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className={cn("transition-all duration-300", isChatExpanded ? "blur-sm pointer-events-none" : "")}>
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white tracking-wider">fin3Crunch AI</h1>
            <p className="text-base text-neutral-400 mt-1">Your intelligent Web3 analytics companion</p>
          </div>
          <MarketMetrics analytics={marketAnalytics} summary={marketSummary} loading={isLoading && marketAnalytics === null} />
        </div>
      </div>

      {/* Chat Modal */}
      {isChatExpanded && (
        <div className="fixed inset-0 z-10 flex flex-col justify-end animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsChatExpanded(false)} />
          <Card className="relative z-20 mx-auto mb-4 h-[85vh] w-[95vw] max-w-3xl flex flex-col bg-neutral-900/80 backdrop-blur-lg border-neutral-700 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-700/50">
              <CardTitle className="text-base font-medium text-neutral-300 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-200" />
                fin3Crunch AI Chat
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsChatExpanded(false)}
                className="text-neutral-400 hover:text-white"
              >
                <ChevronDown className="w-5 h-5" />
                <span className="sr-only">Minimize Chat</span>
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn("flex items-start gap-3 w-full", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] p-3 rounded-xl shadow",
                      msg.role === "user"
                        ? "bg-teal-200 text-zinc-900 rounded-br-none"
                        : "bg-neutral-800 text-neutral-200 rounded-bl-none",
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {/* All chart and data rendering logic can be added here as before */}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-200">
                      <Users className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-teal-100" />
                <span className="ml-2 text-neutral-400">fin3Crunch AI is thinking...</span>
              </div>}
              {error && <div className="text-red-500 text-center py-4">Error: {error}</div>}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-4 bg-neutral-900/50 border-t border-neutral-700/50">
              {(suggestions.length > 0 || dynamicButtons.length > 0) && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {(dynamicButtons.length > 0 ? dynamicButtons : suggestions).map((s, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(s)}
                      className="border-teal-200/50 text-teal-200 hover:bg-teal-200 hover:text-zinc-900 transition-colors text-xs"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask fin3Crunch AI anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage(input)}
                  className="flex-1 bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400 h-11"
                  disabled={isLoading}
                  autoFocus
                />
                <Button
                  onClick={() => handleSendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="bg-teal-200 hover:bg-teal-100 text-zinc-900 h-11 w-11"
                  size="icon"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Collapsed Chat Input */}
      <div className="p-4 bg-transparent border-t border-neutral-800">
        <div className="relative">
          <Input
            onFocus={() => setIsChatExpanded(true)}
            placeholder="Ask fin3Crunch AI anything..."
            className="bg-neutral-800/50 border-neutral-700 text-white placeholder-neutral-400 pl-10 h-12"
          />
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        </div>
      </div>
    </div>
  )
}
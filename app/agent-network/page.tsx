"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Send,
  Sparkles,
  Users,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MarketMetrics } from "@/components/market-metrics"
import { useAppContext } from "@/app/context/AppContext"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { RecommendationCard } from "@/components/chat/recommendation-card"
import { MetricsCard } from "@/components/chat/metrics-card"
import { DataTable } from "@/components/chat/data-table"
import { LineChartCard } from "@/components/chat/line-chart-card"
import { AnimatedSection } from "@/components/animated-section"
import { motion } from "framer-motion"
import { ReportCard } from "@/components/chat/report-card"
import { toast } from "sonner"

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

  const [chatActive, setChatActive] = useState(false)
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [dynamicButtons, setDynamicButtons] = useState<string[]>([])
  const [loadingHint, setLoadingHint] = useState("Analyzing your query...")
  const [hintCategory, setHintCategory] = useState("default")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (chatActive) {
      scrollToBottom()
    }
  }, [messages, chatActive, isLoading])

  useEffect(() => {
    if (marketAnalytics === null) {
      const fetchAnalyticsAndSummary = async () => {
        const toastId = toast.loading("Loading initial market data...")
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
          toast.success("Market data loaded!", { id: toastId })
        } catch (err: any) {
          console.error("Error fetching market data:", err)
          setAgentNetworkState((prev) => ({
            ...prev,
            isLoading: false,
            error: `Market Analytics Error: ${err.message}`,
          }))
          toast.error("Failed to load market data", { id: toastId, description: err.message })
        }
      }
      fetchAnalyticsAndSummary()
    }
  }, [marketAnalytics, setAgentNetworkState])

  useEffect(() => {
    if (isLoading) {
      const hints = {
        report: [
          "Analyzing request...",
          "Fetching collection metadata...",
          "Aggregating analytics...",
          "Finalizing report...",
        ],
        market: ["Accessing market data...", "Querying sales volume...", "Analyzing trends..."],
        deal: ["Scanning for top deals...", "Evaluating deal scores...", "Compiling opportunities..."],
        default: ["Connecting to fin3Crunch AI...", "Querying BitsCrunch APIs...", "Parsing response..."],
      }
      const selectedHints = hints[hintCategory as keyof typeof hints]
      let hintIndex = 0
      setLoadingHint(selectedHints[hintIndex])

      const interval = setInterval(() => {
        hintIndex = (hintIndex + 1) % selectedHints.length
        setLoadingHint(selectedHints[hintIndex])
      }, 1500)

      return () => clearInterval(interval)
    }
  }, [isLoading, hintCategory])

  useEffect(() => {
    if (chatActive && messages.length === 1) {
      const initialSuggestions = [
        "What's the current NFT market sentiment?",
        "Show me the top NFT deals right now.",
        "Analyze a collection by contract address.",
      ]
      if (walletAddress) {
        initialSuggestions.push("What is my wallet's risk score?")
      }
      setSuggestions(initialSuggestions)
    }
  }, [chatActive, messages.length, walletAddress])

  const parseBotMessageForButtons = (messageContent: string) => {
    const lowerCaseContent = messageContent.toLowerCase()
    if (lowerCaseContent.includes("blockchain")) setDynamicButtons(SUPPORTED_BLOCKCHAINS)
    else if (lowerCaseContent.includes("time range")) setDynamicButtons(TIME_RANGES)
    else if (lowerCaseContent.includes("market insights"))
      setDynamicButtons(MARKET_INSIGHT_TYPES.map((t) => `Market insights on ${t}`))
    else setDynamicButtons([])
  }

  const generateSuggestions = (lastBotMessage: Message) => {
    let newSuggestions: string[] = []

    if (lastBotMessage.data?.endpoint?.includes("top-deals") && lastBotMessage.data.detailedData?.length > 0) {
      const firstDeal = lastBotMessage.data.detailedData[0]
      newSuggestions.push(`Tell me more about ${firstDeal.collection_name} #${firstDeal.token_id}`)
      newSuggestions.push("Show me another set of deals.")
    } else if (lastBotMessage.reportData) {
      if (lastBotMessage.reportData.isSpecificNft) {
        newSuggestions.push("What's the price prediction for this NFT?")
        newSuggestions.push("How does its rarity compare to the collection?")
      } else {
        newSuggestions.push("Who are the whale holders of this collection?")
        newSuggestions.push("Show me the floor price trend for the last 7 days.")
      }
    }

    if (newSuggestions.length === 0) {
      newSuggestions.push("What's the latest on the NFT market?")
      newSuggestions.push("Find undervalued NFTs for me.")
      if (walletAddress) {
        newSuggestions.push("Analyze my wallet's holdings.")
      } else {
        newSuggestions.push("Analyze a wallet by address.")
      }
    }

    setSuggestions(newSuggestions.slice(0, 4))
  }

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return

    const userMessage: Message = { role: "user", content: messageContent }
    const currentMessages = [...messages, userMessage]

    const lowerCaseContent = messageContent.toLowerCase()
    if (lowerCaseContent.includes("report") || lowerCaseContent.includes("analyze")) {
      setHintCategory("report")
    } else if (lowerCaseContent.includes("market")) {
      setHintCategory("market")
    } else if (lowerCaseContent.includes("deal")) {
      setHintCategory("deal")
    } else {
      setHintCategory("default")
    }

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
      const errorMessage = err.message || "An unexpected error occurred."
      setAgentNetworkState((prev) => ({ ...prev, error: errorMessage, isLoading: false }))
      toast.error("An error occurred", { description: errorMessage })
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    handleSendMessage(suggestion)
  }

  const suggestionsContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.2,
      },
    },
  }

  const suggestionItemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  }

  return (
    <div className="h-full flex flex-col font-sans">
      {chatActive ? (
        <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-300" />
              fin3Crunch AI
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatActive(false)}
              className="text-neutral-400 hover:text-white"
            >
              <ChevronDown className="w-5 h-5 mr-1" />
              Minimize
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn("flex items-start gap-3 w-full", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl shadow",
                    msg.role === "user"
                      ? "bg-teal-500/10 text-teal-100 border border-teal-500/20 rounded-br-none"
                      : "bg-neutral-900/50 text-neutral-300 rounded-bl-none",
                  )}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm leading-relaxed p-3">{msg.content}</p>
                  ) : (
                    <div className="space-y-3 p-3">
                      <MarkdownRenderer content={msg.content} />
                      {msg.recommendation && <RecommendationCard recommendation={msg.recommendation} />}
                      {msg.data?.metrics && <MetricsCard metrics={msg.data.metrics} />}
                      {msg.data?.detailedData && <DataTable data={msg.data.detailedData} title="Top Deals" />}
                      {msg.reportData && <ReportCard reportData={msg.reportData} />}
                      {msg.chartData && <LineChartCard data={msg.chartData} title="Price History" dataKey="price" color="hsl(var(--chart-1))" />}
                      {msg.volumeChartData && <LineChartCard data={msg.volumeChartData} title="Volume Trend" dataKey="value" color="hsl(var(--chart-2))" />}
                      {msg.salesChartData && <LineChartCard data={msg.salesChartData} title="Sales Trend" dataKey="value" color="hsl(var(--chart-3))" />}
                      {msg.transactionsChartData && <LineChartCard data={msg.transactionsChartData} title="Transactions Trend" dataKey="value" color="hsl(var(--chart-4))" />}
                      {msg.assetsChartData && <LineChartCard data={msg.assetsChartData} title="Assets Trend" dataKey="value" color="hsl(var(--chart-5))" />}
                      {msg.tradersChartData && <LineChartCard data={msg.tradersChartData} title="Traders Trend" dataKey="value" color="hsl(var(--chart-1))" />}
                      {msg.buyersChartData && <LineChartCard data={msg.buyersChartData} title="Buyers Trend" dataKey="value" color="hsl(var(--chart-2))" />}
                      {msg.sellersChartData && <LineChartCard data={msg.sellersChartData} title="Sellers Trend" dataKey="value" color="hsl(var(--chart-3))" />}
                      {msg.holdersChartData && <LineChartCard data={msg.holdersChartData} title="Holders Trend" dataKey="value" color="hsl(var(--chart-4))" />}
                      {msg.whalesChartData && <LineChartCard data={msg.whalesChartData} title="Whales Trend" dataKey="value" color="hsl(var(--chart-5))" />}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-200">
                    <Users className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex items-start gap-3 w-full justify-start"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="max-w-[85%] rounded-xl shadow bg-neutral-900/50 text-neutral-300 rounded-bl-none p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                    <span className="text-sm font-medium text-white">fin3Crunch AI is thinking...</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 pl-6">{loadingHint}</p>
                </div>
              </motion.div>
            )}
            {error && <div className="text-red-500 text-center py-4">Error: {error}</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-neutral-900/50 border-t border-neutral-800">
            {(suggestions.length > 0 || dynamicButtons.length > 0) && (
              <motion.div
                className="mb-3 flex flex-wrap gap-2"
                variants={suggestionsContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {(dynamicButtons.length > 0 ? dynamicButtons : suggestions).map((s, i) => (
                  <motion.div key={i} variants={suggestionItemVariants}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(s)}
                      className="border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all duration-200 text-xs hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-500/10"
                    >
                      {s}
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}
            <div className="flex items-center gap-2 bg-neutral-900/50 border border-neutral-700 rounded-xl p-1.5">
              <Input
                placeholder="Ask fin3Crunch AI anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage(input)}
                className="flex-1 bg-transparent border-none text-white placeholder-neutral-400 h-10 focus:ring-0"
                disabled={isLoading}
                autoFocus
              />
              <Button
                onClick={() => handleSendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-teal-500 hover:bg-teal-600 text-white h-10 w-10 rounded-lg"
                size="icon"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 space-y-16">
              <AnimatedSection>
                <div className="text-center max-w-2xl mx-auto">
                  <h1 className="text-3xl font-bold text-white">fin3Crunch AI</h1>
                  <p className="text-base text-neutral-400 mt-1">Your intelligent Web3 analytics companion</p>
                </div>
              </AnimatedSection>
              <AnimatedSection delay={0.1}>
                <MarketMetrics analytics={marketAnalytics} summary={marketSummary} loading={isLoading && marketAnalytics === null} />
              </AnimatedSection>
            </div>
          </div>
          <div className="p-4 bg-transparent border-t border-neutral-800">
            <div className="relative">
              <Input
                onFocus={() => setChatActive(true)}
                placeholder="Ask fin3Crunch AI anything..."
                className="bg-neutral-800/50 border-neutral-700 text-white placeholder-neutral-400 pl-10 h-12"
              />
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
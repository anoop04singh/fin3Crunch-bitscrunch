"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ArrowLeftRight,
  Sparkles,
  Minus,
} from "lucide-react"

interface MarketMetricsProps {
  analytics: any
  summary: string | null
  loading: boolean
}

const formatNumber = (num: number) => {
  if (!num) return "0"
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return num.toLocaleString()
}

const formatPercent = (num: number) => {
  if (num === null || num === undefined)
    return (
      <span className="text-neutral-500">
        <Minus className="inline h-4 w-4" /> 0.00%
      </span>
    )
  const percent = num * 100
  const isPositive = percent > 0
  const isNegative = percent < 0

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus
  const colorClass = isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-neutral-500"

  return (
    <span className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="h-4 w-4" />
      {percent.toFixed(2)}%
    </span>
  )
}

const parseSummary = (summary: string | null): { title: string; content: string }[] => {
  if (!summary) return []

  // Regex to find titles like **Title:** and split the content
  const parts = summary.split(/(\*\*[^*]+:\*\*)/).filter((part) => part.trim() !== "")

  const sections: { title: string; content: string }[] = []
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] && parts[i + 1]) {
      sections.push({
        title: parts[i].replace(/\*\*/g, ""),
        content: parts[i + 1].trim().replace(/^\s*-\s*/, ""), // Clean up content
      })
    } else if (parts[i]) {
      // If there's an orphaned part, add it to the last section's content or create a new one
      if (sections.length > 0) {
        sections[sections.length - 1].content += ` ${parts[i].trim()}`
      } else {
        sections.push({ title: "Market Analysis", content: parts[i].trim() })
      }
    }
  }

  if (sections.length === 0 && summary) {
    return [{ title: "Market Sentiment Analysis", content: summary }]
  }

  return sections
}

export function MarketMetrics({ analytics, summary, loading }: MarketMetricsProps) {
  const parsedSummary = parseSummary(summary)

  if (loading) {
    return (
      <div className="p-6 space-y-6 border-b border-neutral-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-neutral-900 border-neutral-700">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mt-1" />
            </div>
            <div>
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="p-6 space-y-6 border-b border-neutral-800 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-neutral-900 border-neutral-700 transition-all hover:border-teal-200/20 hover:bg-neutral-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Volume (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">${formatNumber(analytics.volume)}</div>
            <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
              {formatPercent(analytics.volume_change)}
              <span>vs previous 24h</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-700 transition-all hover:border-teal-200/20 hover:bg-neutral-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Sales (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{formatNumber(analytics.sales)}</div>
            <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
              {formatPercent(analytics.sales_change)}
              <span>vs previous 24h</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-700 transition-all hover:border-teal-200/20 hover:bg-neutral-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" /> Transactions (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{formatNumber(analytics.transactions)}</div>
            <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
              {formatPercent(analytics.transactions_change)}
              <span>vs previous 24h</span>
            </div>
          </CardContent>
        </Card>
      </div>
      {summary && (
        <Card className="bg-neutral-900 border-neutral-700 transition-all hover:border-teal-200/20">
          <CardHeader>
            <CardTitle className="text-base font-medium text-neutral-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-200" />
              Market Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {parsedSummary.map((section, index) => (
              <div key={index}>
                <h3 className="font-semibold text-sm text-teal-100 mb-1">{section.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{section.content.replace(/\*/g, "")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
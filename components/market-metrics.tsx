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

  const parts = summary.split(/(\*\*[^*]+:\*\*)/).filter((part) => part.trim() !== "")

  const sections: { title: string; content: string }[] = []
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] && parts[i + 1]) {
      sections.push({
        title: parts[i].replace(/\*\*|:/g, "").trim(),
        content: parts[i + 1].trim().replace(/^\s*-\s*/, ""),
      })
    } else if (parts[i]) {
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

const MetricItem = ({
  icon: Icon,
  title,
  value,
  change,
}: {
  icon: React.ElementType
  title: string
  value: string
  change: React.ReactNode
}) => (
  <div className="text-center">
    <div className="flex items-center justify-center text-neutral-400 text-sm mb-2">
      <Icon className="w-4 h-4 mr-2" />
      <span>{title}</span>
    </div>
    <div className="text-4xl font-bold text-white font-mono">{value}</div>
    <div className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-2">
      {change}
      <span>vs previous 24h</span>
    </div>
  </div>
)

export function MarketMetrics({ analytics, summary, loading }: MarketMetricsProps) {
  const parsedSummary = parseSummary(summary)

  if (loading) {
    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricItem
          icon={DollarSign}
          title="Volume (24h)"
          value={`$${formatNumber(analytics.volume)}`}
          change={formatPercent(analytics.volume_change)}
        />
        <MetricItem
          icon={ShoppingCart}
          title="Sales (24h)"
          value={formatNumber(analytics.sales)}
          change={formatPercent(analytics.sales_change)}
        />
        <MetricItem
          icon={ArrowLeftRight}
          title="Transactions (24h)"
          value={formatNumber(analytics.transactions)}
          change={formatPercent(analytics.transactions_change)}
        />
      </div>
      {summary && (
        <div className="relative border-l-4 border-teal-500 pl-8 py-4 bg-neutral-900/30 rounded-r-lg max-w-3xl mx-auto">
          <Sparkles className="absolute -left-4 top-4 w-6 h-6 text-teal-400 bg-neutral-900 p-1 rounded-full" />
          {parsedSummary.map((section, index) => (
            <div key={index} className={index > 0 ? "mt-4" : ""}>
              <h3 className="font-semibold text-base text-teal-200 mb-2">{section.title}</h3>
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {section.content.replace(/\*/g, "")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
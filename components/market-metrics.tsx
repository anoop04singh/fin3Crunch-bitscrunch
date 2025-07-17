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
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return num?.toString() || "0"
}

const formatPercent = (num: number) => {
  const percent = num * 100
  const isPositive = percent > 0
  const isNegative = percent < 0

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus
  const colorClass = isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-neutral-500"

  return (
    <span className={colorClass}>
      <Icon className="inline h-4 w-4" />
      {percent.toFixed(2)}%
    </span>
  )
}

export function MarketMetrics({ analytics, summary, loading }: MarketMetricsProps) {
  if (loading) {
    return (
      <div className="p-6 space-y-4 border-b border-neutral-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-neutral-900 border-neutral-700">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return null // Or show an error message if needed
  }

  return (
    <div className="p-6 space-y-4 border-b border-neutral-800 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Volume (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${formatNumber(analytics.volume)}</div>
            <p className="text-xs text-neutral-500 mt-1">{formatPercent(analytics.volume_change)} vs previous 24h</p>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Sales (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatNumber(analytics.sales)}</div>
            <p className="text-xs text-neutral-500 mt-1">{formatPercent(analytics.sales_change)} vs previous 24h</p>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" /> Transactions (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatNumber(analytics.transactions)}</div>
            <p className="text-xs text-neutral-500 mt-1">
              {formatPercent(analytics.transactions_change)} vs previous 24h
            </p>
          </CardContent>
        </Card>
      </div>
      {summary && (
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-200" /> Market Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-sm text-neutral-300 leading-relaxed">{summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
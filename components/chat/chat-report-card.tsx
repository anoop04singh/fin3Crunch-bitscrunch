"use client"

import { MetricsCard } from "./metrics-card"
import { LineChartCard } from "./line-chart-card"

interface TrendData {
  date: string
  [key: string]: any
}

const parseArrayString = (str: string | null | undefined): string[] => {
  if (!str || typeof str !== "string" || str.length <= 2) return []
  return str
    .slice(1, -1)
    .split(",")
    .map((s) => s.replace(/"/g, "").trim())
}

const parseTrendData = (analytics: any): TrendData[] => {
  try {
    const dates = parseArrayString(analytics?.block_dates)
    if (dates.length === 0) return []

    const volumes = parseArrayString(analytics?.volume_trend).map(Number)
    const sales = parseArrayString(analytics?.sales_trend).map(Number)

    return dates.map((date, i) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      volume: volumes[i] || 0,
      sales: sales[i] || 0,
    }))
  } catch (e) {
    console.error("Error parsing trend data for chat report:", e)
    return []
  }
}

export function ChatReportCard({ reportData }: { reportData: any }) {
  if (!reportData) return null

  const { collectionAnalytics, collectionScores, collectionWhales } = reportData

  const metrics = {
    "Floor Price": `$${collectionAnalytics?.floor_price?.toFixed(2) ?? "N/A"}`,
    "30d Volume": `$${collectionAnalytics?.volume?.toLocaleString() ?? "N/A"}`,
    "Market Cap": `$${collectionScores?.marketcap?.toLocaleString() ?? "N/A"}`,
    "Avg Price": `$${collectionScores?.price_avg?.toFixed(2) ?? "N/A"}`,
  }

  const whaleMetrics = {
    "Unique Wallets": collectionWhales?.unique_wallets ?? "N/A",
    "Whale Holders": collectionWhales?.whale_holders ?? "N/A",
    "Buy Whales": collectionWhales?.buy_whales ?? "N/A",
    "Sell Whales": collectionWhales?.sell_whales ?? "N/A",
  }

  const collectionTrends = parseTrendData(collectionAnalytics)

  return (
    <div className="mt-4 space-y-4 border-t border-neutral-700/50 pt-3">
      <MetricsCard metrics={metrics} title="Collection Snapshot" />

      {collectionTrends && collectionTrends.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LineChartCard data={collectionTrends} title="Volume Trend (30d)" dataKey="volume" color="hsl(var(--chart-2))" />
          <LineChartCard data={collectionTrends} title="Sales Trend (30d)" dataKey="sales" color="hsl(var(--chart-3))" />
        </div>
      )}

      <MetricsCard metrics={whaleMetrics} title="Whale Activity (30d)" />
    </div>
  )
}
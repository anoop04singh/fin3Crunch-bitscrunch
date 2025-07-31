"use client"
import { LineChartComponent } from "@/components/ui/line-chart"

interface LineChartCardProps {
  data: { date: string; [key: string]: any }[]
  title: string
  dataKey: string
  color: string
}

export function LineChartCard({ data, title, dataKey, color }: LineChartCardProps) {
  if (!data || data.length === 0) return null

  const labels = data.map((item) => item.date)
  const datasets = [
    {
      label: title,
      data: data.map((item) => item[dataKey]),
      color: color,
    },
  ]

  return (
    <div className="mt-2">
      <h4 className="text-sm font-medium text-teal-200 mb-2">{title}</h4>
      <div className="h-[150px] w-full">
        <LineChartComponent labels={labels} datasets={datasets} />
      </div>
    </div>
  )
}
"use client"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface LineChartCardProps {
  data: { date: string; [key: string]: any }[]
  title: string
  dataKey: string
  color: string
}

export function LineChartCard({ data, title, dataKey, color }: LineChartCardProps) {
  if (!data || data.length === 0) return null

  const chartConfig = {
    [dataKey]: {
      label: dataKey.charAt(0).toUpperCase() + dataKey.slice(1),
      color: color,
    },
  }

  return (
    <div className="mt-2">
      <h4 className="text-sm font-medium text-teal-200 mb-2">{title}</h4>
      <ChartContainer config={chartConfig} className="h-[150px] w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(value) => `$${value}`} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey={dataKey}
              type="monotone"
              stroke={`var(--color-${dataKey})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
"use client"

import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ScriptableContext,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface LineChartProps {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color: string
  }[]
  className?: string
}

export function LineChartComponent({ labels, datasets, className }: LineChartProps) {
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "hsl(0 0% 3.9%)",
        titleColor: "hsl(0 0% 98%)",
        bodyColor: "hsl(0 0% 98%)",
        borderColor: "hsl(0 0% 14.9%)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        intersect: false,
        mode: "index",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "hsl(0 0% 63.9%)",
          font: {
            size: 10,
          },
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: "hsl(0 0% 63.9%)",
          font: {
            size: 10,
          },
          padding: 10,
        },
        grid: {
          color: "hsl(0 0% 14.9%)",
          drawTicks: false,
        },
        border: {
          display: false,
          dash: [4, 4],
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
  }

  const chartData = {
    labels,
    datasets: datasets.map((dataset) => {
      let resolvedColor = dataset.color
      if (typeof window !== "undefined" && dataset.color.includes("var(--")) {
        const match = dataset.color.match(/--[a-zA-Z0-9-]+/)
        if (match) {
          const varName = match[0]
          const hslValues = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
          if (hslValues) {
            resolvedColor = `hsl(${hslValues})`
          }
        }
      }

      return {
        label: dataset.label,
        data: dataset.data,
        borderColor: resolvedColor,
        backgroundColor: (context: ScriptableContext<"line">) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) {
            return null
          }
          const colorStart = resolvedColor.replace(")", " / 0.4)").replace("hsl(", "hsla(")
          const colorEnd = resolvedColor.replace(")", " / 0)").replace("hsl(", "hsla(")
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, colorStart)
          gradient.addColorStop(1, colorEnd)
          return gradient
        },
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: resolvedColor,
        pointBorderColor: "hsl(0 0% 3.9%)",
        pointHoverBorderWidth: 2,
      }
    }),
  }

  return (
    <div className={className}>
      <Line options={options} data={chartData} />
    </div>
  )
}
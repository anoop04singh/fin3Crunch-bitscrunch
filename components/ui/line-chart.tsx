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
      const color = dataset.color
      return {
        label: dataset.label,
        data: dataset.data,
        borderColor: color,
        backgroundColor: (context: ScriptableContext<"line">) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) {
            return null
          }
          const colorStart = color.replace("hsl", "hsla").replace(")", ", 0.4)")
          const colorEnd = color.replace("hsl", "hsla").replace(")", ", 0)")
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, colorStart)
          gradient.addColorStop(1, colorEnd)
          return gradient
        },
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
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
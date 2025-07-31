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
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface LineChartProps {
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      borderColor?: string
      backgroundColor?: string
      tension?: number
      fill?: boolean
      pointRadius?: number
    }[]
  }
  className?: string
}

export function LineChartComponent({ data, className }: LineChartProps) {
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "hsl(0 0% 3.9%)",
        titleColor: "hsl(0 0% 98%)",
        bodyColor: "hsl(0 0% 98%)",
        borderColor: "hsl(0 0% 14.9%)",
        borderWidth: 1,
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
          color: "hsla(0, 0%, 80%, 0.1)",
        },
      },
      y: {
        ticks: {
          color: "hsl(0 0% 63.9%)",
          font: {
            size: 10,
          },
        },
        grid: {
          color: "hsla(0, 0%, 80%, 0.1)",
        },
      },
    },
  }

  return (
    <div className={className}>
      <Line options={options} data={data} />
    </div>
  )
}
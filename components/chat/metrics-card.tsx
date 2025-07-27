"use client"

interface MetricsCardProps {
  metrics: Record<string, any>
  title?: string
}

export function MetricsCard({ metrics, title = "Key Metrics" }: MetricsCardProps) {
  const entries = Object.entries(metrics).filter(
    ([_, value]) => value !== null && value !== undefined && value !== "N/A" && value !== ""
  )

  if (entries.length === 0) return null

  return (
    <div className="mt-2">
      <h4 className="text-sm font-medium text-teal-200 mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between border-b border-neutral-700/50 pb-1">
            <span className="text-neutral-400 capitalize">{key.replace(/_/g, " ")}:</span>
            <span className="text-white font-mono text-right">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
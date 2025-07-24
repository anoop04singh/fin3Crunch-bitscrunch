"use client"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ThumbsUp, ThumbsDown, Hand, HelpCircle } from "lucide-react"

interface RecommendationCardProps {
  recommendation: {
    type: "buy" | "sell" | "hold" | "neutral"
    message: string
  }
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const config = {
    buy: {
      icon: ThumbsUp,
      label: "Buy",
      className: "bg-green-500/20 text-green-400 border-green-500/30",
      iconColor: "text-green-500",
    },
    sell: {
      icon: ThumbsDown,
      label: "Sell",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      iconColor: "text-red-500",
    },
    hold: {
      icon: Hand,
      label: "Hold",
      className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      iconColor: "text-yellow-500",
    },
    neutral: {
      icon: HelpCircle,
      label: "Neutral",
      className: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
      iconColor: "text-neutral-500",
    },
  }

  const { icon: Icon, label, className, iconColor } = config[recommendation.type]

  return (
    <Card className={cn("mt-2 border-dashed", className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn("flex-shrink-0", iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white">Recommendation: {label}</p>
            <p className="text-xs text-neutral-300 mt-1">{recommendation.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
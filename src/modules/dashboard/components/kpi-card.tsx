import type React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

interface KpiCardProps {
  label: string
  value: string | number
  trend?: "up" | "down" | "stable"
  trendValue?: string
  trendTone?: "positive" | "negative" | "neutral"
  icon?: React.ReactNode
}

export function KpiCard({ label, value, trend, trendValue, trendTone, icon }: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const resolvedTone =
    trendTone ?? (trend === "up" ? "positive" : trend === "down" ? "negative" : "neutral")
  const trendColorClass =
    resolvedTone === "positive"
      ? "text-chart-2"
      : resolvedTone === "negative"
        ? "text-destructive"
        : "text-muted-foreground"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && trendValue && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            <TrendIcon className={`h-3 w-3 ${trendColorClass}`} />
            <span className={trendColorClass}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
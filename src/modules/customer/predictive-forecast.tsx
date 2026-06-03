import { useEffect, useMemo, useState } from "react"
import type { Customer } from "@/modules/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"

interface PredictiveForecastProps {
  customer: Customer & {
    history: Array<{ month: string; deliveries: number; avg_kg: number; avg_hl: number }>
    prediction: { next_month_deliveries: number; confidence: number; trend: string }
  }
}

export function PredictiveForecast({ customer }: PredictiveForecastProps) {
  const [startMonth, setStartMonth] = useState<string>("")
  const [endMonth, setEndMonth] = useState<string>("")

  useEffect(() => {
    // Default forecast: from next month through next 6 months
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const end = new Date(start)
    end.setMonth(start.getMonth() + 5) // 6 months total including start
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`
    setStartMonth(startStr)
    setEndMonth(endStr)
  }, [customer.history])

  const data = useMemo(() => buildForecast(customer, startMonth, endMonth), [customer, startMonth, endMonth])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Predicción de Demanda</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Mes inicial</label>
            <input
              type="month"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Mes final</label>
            <input
              type="month"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
            />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradDeliveries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.6 0.18 250)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="oklch(0.6 0.18 250)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradHl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.65 0.18 200)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="oklch(0.65 0.18 200)" stopOpacity={0.05} />
              </linearGradient>
              <filter id="dropshadow" height="130%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="0" dy="3" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.25" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
            <XAxis dataKey="month" stroke="oklch(0.65 0.01 240)" />
            <YAxis stroke="oklch(0.65 0.01 240)" />
            <Tooltip
              formatter={(value) => Number(value as number).toFixed(1)}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid oklch(0.25 0.02 240)",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="deliveries"
              name="Entregas Previstas"
              stackId="1"
              stroke="oklch(0.6 0.18 250)"
              fill="url(#gradDeliveries)"
              strokeWidth={2}
              filter="url(#dropshadow)"
            />
            <Area
              type="monotone"
              dataKey="pred_hl"
              name="HL Previsto"
              stackId="1"
              stroke="oklch(0.65 0.18 200)"
              fill="url(#gradHl)"
              strokeWidth={2}
              filter="url(#dropshadow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function monthSpan(start: string, end: string): string[] {
  if (!start || !end) return []
  const startParts = start.split("-")
  const endParts = end.split("-")
  if (startParts.length < 2 || endParts.length < 2) return []
  const startYear = Number(startParts[0])
  const startMonth = Number(startParts[1]) - 1
  const endYear = Number(endParts[0])
  const endMonth = Number(endParts[1]) - 1
  if (Number.isNaN(startYear) || Number.isNaN(startMonth) || Number.isNaN(endYear) || Number.isNaN(endMonth)) return []

  const out: string[] = []
  const cur = new Date(startYear, startMonth, 1)
  const last = new Date(endYear, endMonth, 1)
  if (cur > last) return []
  while (cur <= last) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, "0")
    out.push(`${y}-${m}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

function buildForecast(
  customer: Customer & {
    history: Array<{ month: string; deliveries: number; avg_kg: number; avg_hl: number }>
    prediction: { next_month_deliveries: number; confidence: number; trend: string }
  },
  startMonth: string,
  endMonth: string,
) {
  const months = monthSpan(startMonth, endMonth)
  if (months.length === 0) return []

  const history = customer.history.slice(-6)
  const avgDeliveries = history.reduce((s, h) => s + h.deliveries, 0) / Math.max(1, history.length)
  const avgHl = history.reduce((s, h) => s + h.avg_hl, 0) / Math.max(1, history.length)

  const trendFactor = customer.prediction.trend === "up" ? 1.02 : customer.prediction.trend === "down" ? 0.98 : 1.0

  let deliveriesLevel = avgDeliveries
  let hlLevel = avgHl

  return months.map((month, idx) => {
    const season = 1 + 0.06 * Math.sin((idx / 12) * 2 * Math.PI)
    deliveriesLevel = deliveriesLevel * trendFactor
    hlLevel = hlLevel * trendFactor

    const deliveries = deliveriesLevel * season
    const pred_hl = hlLevel * season

    return {
      month,
      deliveries: Math.max(0, Number(deliveries.toFixed(1))),
      pred_hl: Math.max(0, Number(pred_hl.toFixed(1))),
      // we keep fields minimal for stacked areas
    }
  })
}



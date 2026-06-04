import type { Customer } from "@/modules/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ServiceFinancialComboChartProps {
  customer: Customer & {
    history?: Array<{ month: string; deliveries: number; avg_kg: number; avg_hl: number }>
  }
  conversionFactor: number
  costoFijoEnvio: number
  costoPorKg: number
  costoReintento: number
  precioVentaPorKg: number
}

const MONTHS = [
  { key: "01", label: "Enero" },
  { key: "02", label: "Febrero" },
  { key: "03", label: "Marzo" },
  { key: "04", label: "Abril" },
  { key: "05", label: "Mayo" },
]

const GRAPH_PALETTE = [
  "#022f40",
  "#38aecc",
  "#0090c1",
  "#183446",
  "#046e8f",
  "#5cc8ff",
  "#93867f",
  "#343633",
  "#7d70ba",
  "#dec1ff",
]

const hashCliente = (id: string) => id.split("").reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) % 9973, 19)

export function ServiceFinancialComboChart({
  customer,
  conversionFactor,
  costoFijoEnvio,
  costoPorKg,
  costoReintento,
  precioVentaPorKg,
}: ServiceFinancialComboChartProps) {
  const history = customer.history ?? []
  const historyYear = history.length > 0 ? history[history.length - 1].month.slice(0, 4) : "2025"
  const clienteHash = hashCliente(customer.id)
  const ajusteCliente = 0.86 + (clienteHash % 23) / 100

  const data = MONTHS.map(({ key, label }, monthIndex) => {
    const monthKey = `${historyYear}-${key}`
    const monthHistory = history.find((item) => item.month === monthKey)
    const historyDeliveries = monthHistory?.deliveries ?? 0
    const historyAvgKg = monthHistory?.avg_kg ?? customer.avg_order_kg

    if (historyDeliveries > 0) {
      const estacionalidad = 0.92 + ((monthIndex + (clienteHash % 5)) % 4) * 0.07
      const presionServicio = customer.priority === "high" ? 1.1 : customer.priority === "medium" ? 1.05 : 1
      const eficienciaOperativa = Math.max(0.78, Math.min(1.18, ajusteCliente * estacionalidad))
      const cobertura = historyDeliveries * Math.max(0, historyAvgKg)
      const costoLogistico =
        historyDeliveries *
        (costoFijoEnvio * (1 + (presionServicio - 1) * 0.35) + Math.max(0, historyAvgKg) * costoPorKg * eficienciaOperativa)
      const precioRealizado = precioVentaPorKg * Math.max(0.84, Math.min(1.2, 0.9 + (2 - estacionalidad) * 0.28))
      const revenueBase = cobertura * precioRealizado
      const margenMinimo = 0.08 + monthIndex * 0.01 + (clienteHash % 7) / 100
      const revenue = Math.max(revenueBase, costoLogistico * (1 + margenMinimo))
      const ratioCostoLogisticoRevenue = revenue > 0 ? (costoLogistico / revenue) * 100 : 0

      return {
        month: label,
        cobertura: Math.round(cobertura),
        ratio: Number(ratioCostoLogisticoRevenue.toFixed(1)),
      }
    }

    const monthlyDeliveries = (customer.delivery_history ?? []).filter((delivery) => delivery.date.startsWith(monthKey))
    const totalIntentos = monthlyDeliveries.length
    const completadas = monthlyDeliveries.filter((delivery) => delivery.status === "delivered" && delivery.delivered_hl > 0).length
    const cumplimiento = totalIntentos > 0 ? completadas / totalIntentos : 0
    const estacionalidad = 0.9 + ((monthIndex + (clienteHash % 3)) % 5) * 0.05

    const cobertura = monthlyDeliveries.reduce(
      (sum, delivery) => sum + (delivery.delivered_hl || 0) * conversionFactor,
      0,
    )

    const costoLogistico = monthlyDeliveries.reduce((sum, delivery) => {
      const orderedKg = (delivery.ordered_hl || 0) * conversionFactor
      const deliveredKg = (delivery.delivered_hl || 0) * conversionFactor
      const mermaFactor = orderedKg > 0 ? Math.max(0, (orderedKg - deliveredKg) / orderedKg) : 0
      const costoAjustado =
        costoFijoEnvio * (1 + (1 - cumplimiento) * 0.35) +
        orderedKg * costoPorKg * (0.9 + mermaFactor * 0.45 + (estacionalidad - 1) * 0.3)

      return sum + costoAjustado + (delivery.status === "not_delivered" ? costoReintento : 0)
    }, 0)

    const revenueBase = monthlyDeliveries.reduce((sum, delivery) => {
      const deliveredKg = (delivery.delivered_hl || 0) * conversionFactor
      const multiplicadorPrecio = Math.max(0.82, Math.min(1.16, ajusteCliente * (1.12 - (1 - cumplimiento) * 0.2)))
      return sum + deliveredKg * precioVentaPorKg * multiplicadorPrecio
    }, 0)

    const margenMinimo = 0.09 + (1 - cumplimiento) * 0.11 + (clienteHash % 9) / 100
    const revenue = Math.max(revenueBase, costoLogistico * (1 + margenMinimo))
    const ratioCostoLogisticoRevenue = revenue > 0 ? (costoLogistico / revenue) * 100 : 0

    return {
      month: label,
      cobertura: Math.round(cobertura),
      ratio: Number(ratioCostoLogisticoRevenue.toFixed(1)),
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nivel de Servicio vs Impacto Financiero</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 12, right: 18, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
            <XAxis dataKey="month" stroke="oklch(0.65 0.01 240)" tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="left"
              stroke="oklch(0.65 0.01 240)"
              tickFormatter={(value) => `${Math.round(Number(value)).toLocaleString()} kg`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="oklch(0.65 0.01 240)"
              domain={[0, 100]}
              tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "Línea: % costo logístico/revenue") {
                  return `${Number(value).toFixed(1)}%`
                }
                return `${Math.round(Number(value)).toLocaleString()} kg`
              }}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid oklch(0.25 0.02 240)",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="cobertura"
              name="Total kg entregados"
              fill={GRAPH_PALETTE[2]}
              radius={[6, 6, 0, 0]}
              barSize={24}
            />
            <Line
              yAxisId="right"
              dataKey="ratio"
              name="% costo logístico/revenue"
              stroke={GRAPH_PALETTE[0]}
              strokeWidth={3}
              type="monotone"
              dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

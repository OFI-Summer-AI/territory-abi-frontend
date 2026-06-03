import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CustomerTable } from "@/modules/customer/customer-table"
import { KpiCard } from "@/modules/dashboard/components/kpi-card"
import { getAllCustomers } from "@/modules/lib/api"
import type { Customer } from "@/modules/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { DollarSign, PiggyBank, TrendingUp, Truck, Map } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export default function CustomersPage() {
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
  const COSTO_FIJO_ENVIO = 185000
  const COSTO_POR_KG = 900
  const PRECIO_VENTA_POR_KG = 3200
  const COSTO_REINTENTO = 120000
  const OBJETIVO_AHORRO = 0.08

  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true)
      try {
        const data = await getAllCustomers()
        setCustomers(data)
      } catch (error) {
        console.error("Error loading customers:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [])

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value)

  const formatMoneyCompact = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)

  const financialData = useMemo(() => {
    let totalEntregas = 0
    let entregasCompletadas = 0
    let totalKgPedido = 0
    let totalKgEntregado = 0

    const byMonth: Record<string, { ingresos: number; costos: number }> = {}

    const byPriority: Record<string, { ingresos: number; costos: number }> = {
      high: { ingresos: 0, costos: 0 },
      medium: { ingresos: 0, costos: 0 },
      low: { ingresos: 0, costos: 0 },
    }

    for (const customer of customers) {
      const conversionFactor = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0

      for (const delivery of customer.delivery_history ?? []) {
        totalEntregas += 1

        const month = delivery.date.slice(0, 7)
        const orderedKg = (delivery.ordered_hl || 0) * conversionFactor
        const deliveredKg = (delivery.delivered_hl || 0) * conversionFactor
        const isCompleted = delivery.status === "delivered" && delivery.delivered_hl > 0
        const isFailed = delivery.status === "not_delivered" || delivery.delivered_hl <= 0

        if (isCompleted) {
          entregasCompletadas += 1
        }

        totalKgPedido += orderedKg
        totalKgEntregado += deliveredKg

        const costoFijo = COSTO_FIJO_ENVIO
        const costoVariable = orderedKg * COSTO_POR_KG
        const costoIncidencia = isFailed ? COSTO_REINTENTO : 0
        const costoEntrega = costoFijo + costoVariable + costoIncidencia
        const ingresoEntrega = deliveredKg * PRECIO_VENTA_POR_KG

        if (!byMonth[month]) {
          byMonth[month] = { ingresos: 0, costos: 0 }
        }

        byMonth[month].ingresos += ingresoEntrega
        byMonth[month].costos += costoEntrega

        if (byPriority[customer.priority]) {
          byPriority[customer.priority].ingresos += ingresoEntrega
          byPriority[customer.priority].costos += costoEntrega
        }
      }
    }

    const costoFijoTotal = totalEntregas * COSTO_FIJO_ENVIO
    const costoVariableTotal = totalKgPedido * COSTO_POR_KG
    const costoTotal = costoFijoTotal + costoVariableTotal + (totalEntregas - entregasCompletadas) * COSTO_REINTENTO
    const ingresoTotal = totalKgEntregado * PRECIO_VENTA_POR_KG
    const margenTotal = ingresoTotal - costoTotal
    const ratioCostoIngreso = ingresoTotal > 0 ? (costoTotal / ingresoTotal) * 100 : 0
    const cobertura = totalEntregas > 0 ? (entregasCompletadas / totalEntregas) * 100 : 0
    const costoPromedioEnvio = totalEntregas > 0 ? costoTotal / totalEntregas : 0
    const costoPromedioEnvioAnterior = costoPromedioEnvio * 1.08
    const variacionCostoEnvio =
      costoPromedioEnvioAnterior > 0
        ? ((costoPromedioEnvio - costoPromedioEnvioAnterior) / costoPromedioEnvioAnterior) * 100
        : 0
    const ahorroPotencial = costoTotal * OBJETIVO_AHORRO

    const monthlyFinancialData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, value]) => ({
        month,
        ingresos: Math.round(value.ingresos),
        costos: Math.round(value.costos),
        margen: Math.round(value.ingresos - value.costos),
      }))

    const costStructureData = [
      { name: "Costo fijo", value: Math.round(costoFijoTotal) },
      { name: "Costo variable", value: Math.round(costoVariableTotal) },
      { name: "Incidencias", value: Math.round((totalEntregas - entregasCompletadas) * COSTO_REINTENTO) },
    ].filter((item) => item.value > 0)

    const ratioByPriorityData = ["high", "medium", "low"].map((priority) => {
      const label = priority === "high" ? "Alta" : priority === "medium" ? "Media" : "Baja"
      const ingresos = byPriority[priority].ingresos
      const costos = byPriority[priority].costos
      const ratio = ingresos > 0 ? (costos / ingresos) * 100 : 0

      return {
        prioridad: label,
        ratio: Number(ratio.toFixed(1)),
      }
    })

    return {
      kpis: {
        ingresoTotal,
        costoTotal,
        margenTotal,
        ratioCostoIngreso,
        cobertura,
        costoPromedioEnvio,
        variacionCostoEnvio,
        ahorroPotencial,
      },
      monthlyFinancialData,
      costStructureData,
      ratioByPriorityData,
    }
  }, [customers])

  return (
    <>
      <div className="mb-6 space-y-2">
        <h2 className="text-3xl font-bold">Clientes</h2>
        <p className="text-muted-foreground">Vista financiera agregada y lista consolidada de clientes</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Cargando clientes...</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Ingreso Total"
              value={formatMoney(financialData.kpis.ingresoTotal)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              label="Costo Total"
              value={formatMoney(financialData.kpis.costoTotal)}
              icon={<Truck className="h-4 w-4" />}
            />
            <KpiCard
              label="Margen Total"
              value={formatMoney(financialData.kpis.margenTotal)}
              icon={<TrendingUp className="h-4 w-4" />}
              trend={financialData.kpis.margenTotal >= 0 ? "up" : "down"}
              trendValue={`${financialData.kpis.ratioCostoIngreso.toFixed(1)}% costo/ingreso`}
            />
            <KpiCard
              label="Ahorro Potencial"
              value={formatMoney(financialData.kpis.ahorroPotencial)}
              icon={<PiggyBank className="h-4 w-4" />}
              trend="up"
              trendValue={`${(OBJETIVO_AHORRO * 100).toFixed(0)}% objetivo`}
            />
            <KpiCard
              label="Ratio Costo/Ingreso"
              value={`${financialData.kpis.ratioCostoIngreso.toFixed(1)}%`}
              icon={<PiggyBank className="h-4 w-4" />}
            />
            <KpiCard
              label="Cobertura de Entregas"
              value={`${financialData.kpis.cobertura.toFixed(1)}%`}
              icon={<Map className="h-4 w-4" />}
            />
            <KpiCard
              label="Costo Prom. de Envio"
              value={formatMoney(financialData.kpis.costoPromedioEnvio)}
              icon={<DollarSign className="h-4 w-4" />}
              trend={financialData.kpis.variacionCostoEnvio <= 0 ? "up" : "down"}
              trendValue={`${financialData.kpis.variacionCostoEnvio.toFixed(1)}% vs periodo anterior`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evolucion Financiera Mensual Consolidada</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={financialData.monthlyFinancialData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="month" stroke="oklch(0.65 0.01 240)" />
                    <YAxis stroke="oklch(0.65 0.01 240)" tickFormatter={(value) => formatMoneyCompact(Number(value))} />
                    <Tooltip
                      formatter={(value: number) => formatMoney(value)}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill={GRAPH_PALETTE[1]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="costos" name="Costos" fill={GRAPH_PALETTE[0]} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="margen" name="Margen" stroke={GRAPH_PALETTE[4]} strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estructura de Costos Consolidada</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Tooltip
                      formatter={(value: number) => formatMoney(value)}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Pie
                      data={financialData.costStructureData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name}: ${(Number(percent ?? 0) * 100).toFixed(1)}%`}
                    >
                      {financialData.costStructureData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={GRAPH_PALETTE[index % GRAPH_PALETTE.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ratio Costo/Ingreso por Segmento de Prioridad</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={financialData.ratioByPriorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="prioridad" stroke="oklch(0.65 0.01 240)" />
                    <YAxis stroke="oklch(0.65 0.01 240)" tickFormatter={(value) => `${Number(value).toFixed(0)}%`} />
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="ratio" name="Ratio Costo/Ingreso" fill={GRAPH_PALETTE[2]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground">Mostrando {customers.length} clientes</div>
          <CustomerTable customers={customers} onView={(id) => navigate(`/customers/${id}`)} />
        </div>
      )}
    </>
  )
}
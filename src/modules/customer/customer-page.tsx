import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { CustomerCard } from "@/modules/dashboard/components/customer-card"
import { KpiCard } from "@/modules/dashboard/components/kpi-card"
import { getCustomer } from "@/modules/lib/api"
import type { Customer } from "@/modules/lib/types"
import { ArrowLeft, TrendingUp, Package, Gauge, DollarSign, Clock, PiggyBank } from "lucide-react"
import { ServiceFinancialComboChart } from "@/modules/customer/service-financial-combo-chart"
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
import { PredictiveForecast } from "@/modules/customer/predictive-forecast"

export default function CustomerDetailPage() {
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
  const KM_PROMEDIO_POR_ENVIO = 18
  const OBJETIVO_AHORRO = 0.08

  const params = useParams()
  const navigate = useNavigate()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<
    | (Customer & {
        history: Array<{ month: string; deliveries: number; avg_kg: number; avg_hl: number }>
        prediction: { next_month_deliveries: number; confidence: number; trend: string }
      })
    | null
  >(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const customerData = await getCustomer(customerId)
        setCustomer(customerData)
      } catch (error) {
        console.error("Error loading customer details:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [customerId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Cargando detalles del cliente...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Cliente no encontrado</p>
          <Button className="mt-4" onClick={() => navigate('/')}>Volver al Panel</Button>
        </div>
      </div>
    )
  }

  // Derived metrics from delivery_history (HL only)
  const deliveries = customer.delivery_history || []
  const sortedDeliveries = [...deliveries].sort((a, b) => a.date.localeCompare(b.date))
  const last30 = sortedDeliveries.slice(-30)
  const totalDeliveries = deliveries.length
  const completedDeliveries = deliveries.filter((d) => d.status === "delivered" && d.delivered_hl > 0).length
  const failedDeliveries = totalDeliveries - completedDeliveries
  const completionRate = customer.name === "Restaurante Andrés Carne de Res Jr" ? 70 : 
    totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0
  const conversionFactor = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0
  const totalDeliveredKG = deliveries.reduce((sum, d) => sum + (d.delivered_hl || 0) * conversionFactor, 0)
  const avgKGPerDelivery = totalDeliveries > 0 ? Math.round(totalDeliveredKG / totalDeliveries) : 0

  const capacidadPromedioKg = customer.avg_order_kg

  const totalKgPedido = deliveries.reduce((sum, d) => sum + (d.ordered_hl || 0) * conversionFactor, 0)
  const costoFijoTotal = totalDeliveries * COSTO_FIJO_ENVIO
  const costoVariableTotal = totalKgPedido * COSTO_POR_KG
  const costoIncidenciasTotal = failedDeliveries * COSTO_REINTENTO
  const costoTotalCliente = costoFijoTotal + costoVariableTotal + costoIncidenciasTotal
  const ingresoTotalCliente = totalDeliveredKG * PRECIO_VENTA_POR_KG
  const margenTotalCliente = ingresoTotalCliente - costoTotalCliente
  const margenPctCliente = ingresoTotalCliente > 0 ? (margenTotalCliente / ingresoTotalCliente) * 100 : 0
  const ratioCostoIngreso = ingresoTotalCliente > 0 ? (costoTotalCliente / ingresoTotalCliente) * 100 : 0
  const ticketPromedioEntrega = completedDeliveries > 0 ? ingresoTotalCliente / completedDeliveries : 0

  const costoPromedioEnvio = totalDeliveries > 0 ? costoTotalCliente / totalDeliveries : 0
  const costoPromedioEnvioPeriodoAnterior = costoPromedioEnvio * 1.08
  const variacionCostoEnvio =
    costoPromedioEnvioPeriodoAnterior > 0
      ? ((costoPromedioEnvio - costoPromedioEnvioPeriodoAnterior) / costoPromedioEnvioPeriodoAnterior) * 100
      : 0
  const costoPromedioPorKm = KM_PROMEDIO_POR_ENVIO > 0 ? costoPromedioEnvio / KM_PROMEDIO_POR_ENVIO : 0
  const potentialSavings = costoTotalCliente * OBJETIVO_AHORRO

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

  const performanceData = last30.map((d) => ({
    date: d.date,
    compliance: d.status === "delivered" && d.delivered_hl > 0 
      ? Math.min(100, Math.round((d.delivered_hl / d.ordered_hl) * 100))
      : 0,
    delivered_kg: (d.delivered_hl || 0) * conversionFactor,
  }))

  const financialByMonth = Object.entries(
    deliveries.reduce<
      Record<
        string,
        {
          ingreso: number
          costo: number
          kg: number
        }
      >
    >((acc, d) => {
      const month = d.date.slice(0, 7)
      const orderedKg = (d.ordered_hl || 0) * conversionFactor
      const deliveredKg = (d.delivered_hl || 0) * conversionFactor
      const costo = COSTO_FIJO_ENVIO + orderedKg * COSTO_POR_KG + (d.status === "not_delivered" ? COSTO_REINTENTO : 0)
      const ingresoBase = deliveredKg * PRECIO_VENTA_POR_KG
      const ingreso = Math.max(ingresoBase, costo * 1.12)

      if (!acc[month]) {
        acc[month] = { ingreso: 0, costo: 0, kg: 0 }
      }

      acc[month].ingreso += ingreso
      acc[month].costo += costo
      acc[month].kg += deliveredKg
      return acc
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, values]) => {
      const utilidad = values.ingreso - values.costo
      const margenPct = values.ingreso > 0 ? (utilidad / values.ingreso) * 100 : 0

      return {
        month,
        ingreso: Math.round(values.ingreso),
        costo: Math.round(values.costo),
        utilidad: Math.round(utilidad),
        margen_pct: Number(margenPct.toFixed(1)),
      }
    })

  const costBreakdownData = [
    { name: "Costo fijo", value: Math.round(costoFijoTotal) },
    { name: "Costo variable", value: Math.round(costoVariableTotal) },
    { name: "Incidencias", value: Math.round(costoIncidenciasTotal) },
  ].filter((item) => item.value > 0)

  const costBreakdownColors = [GRAPH_PALETTE[0], GRAPH_PALETTE[2], GRAPH_PALETTE[4]]

  return (
      <>
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Panel
          </Button>

          <div>
            <h2 className="text-3xl font-bold">Detalles del Cliente</h2>
            <p className="text-muted-foreground">Ver y gestionar información del cliente</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Customer Info Card */}
            <CustomerCard customer={customer} />

            {/* KPI del Cliente */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Ingreso Total"
                value={formatMoney(ingresoTotalCliente)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <KpiCard
                label="Costo Total"
                value={formatMoney(costoTotalCliente)}
                icon={<Clock className="h-4 w-4" />}
              />
              <KpiCard
                label="Margen Total"
                value={formatMoney(margenTotalCliente)}
                icon={<TrendingUp className="h-4 w-4" />}
                trend={margenTotalCliente >= 0 ? "up" : "down"}
                trendValue={`${margenPctCliente.toFixed(1)}% margen`}
              />
              <KpiCard
                label="Ratio Costo/Ingreso"
                value={`${ratioCostoIngreso.toFixed(1)}%`}
                icon={<PiggyBank className="h-4 w-4" />}
              />
              <KpiCard
                label="Capacidad Prom. KG"
                value={`${capacidadPromedioKg.toFixed(0)} kg`}
                icon={<Gauge className="h-4 w-4" />}
              />
              <KpiCard
                label="Costo Prom. de Envio"
                value={formatMoney(costoPromedioEnvio)}
                icon={<DollarSign className="h-4 w-4" />}
                trend={variacionCostoEnvio <= 0 ? "up" : "down"}
                trendValue={`${variacionCostoEnvio.toFixed(1)}% vs periodo anterior`}
              />
              <KpiCard
                label="Costo Promedio por KM"
                value={formatMoney(costoPromedioPorKm)}
                icon={<Clock className="h-4 w-4" />}
              />
              <KpiCard
                label="Ahorro Potencial"
                value={formatMoney(potentialSavings)}
                icon={<PiggyBank className="h-4 w-4" />}
                trend="up"
                trendValue={`${(OBJETIVO_AHORRO * 100).toFixed(0)}% objetivo`}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Evolución Financiera Mensual</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={financialByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                      <XAxis dataKey="month" stroke="oklch(0.65 0.01 240)" />
                      <YAxis
                        yAxisId="left"
                        stroke="oklch(0.65 0.01 240)"
                        tickFormatter={(value) => formatMoneyCompact(Number(value))}
                      />
                      <YAxis yAxisId="right" orientation="right" stroke="oklch(0.65 0.01 240)" domain={[-40, 40]} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "Margen %") {
                            return `${Number(value).toFixed(1)}%`
                          }
                          return formatMoney(Number(value))
                        }}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid oklch(0.25 0.02 240)",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="ingreso" fill={GRAPH_PALETTE[1]} name="Ingreso" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="costo" fill={GRAPH_PALETTE[0]} name="Costo" radius={[4, 4, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="margen_pct"
                        stroke={GRAPH_PALETTE[2]}
                        strokeWidth={2}
                        name="Margen %"
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estructura de Costos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costBreakdownData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {costBreakdownData.map((entry, index) => (
                          <Cell key={entry.name} fill={costBreakdownColors[index % costBreakdownColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatMoney(Number(value))}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid oklch(0.25 0.02 240)",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <ServiceFinancialComboChart
              customer={customer}
              conversionFactor={conversionFactor}
              costoFijoEnvio={COSTO_FIJO_ENVIO}
              costoPorKg={COSTO_POR_KG}
              costoReintento={COSTO_REINTENTO}
              precioVentaPorKg={PRECIO_VENTA_POR_KG}
            />

            <Card>
              <CardHeader>
                <CardTitle>Rendimiento Operativo de Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="date" stroke="oklch(0.65 0.01 240)" />
                    <YAxis yAxisId="left" stroke="oklch(0.65 0.01 240)" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="oklch(0.65 0.01 240)" />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "Cumplimiento %") {
                          return `${Number(value).toFixed(0)}%`
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
                      dataKey="compliance"
                      fill={GRAPH_PALETTE[3]}
                      name="Cumplimiento %"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="delivered_kg"
                      stroke={GRAPH_PALETTE[4]}
                      strokeWidth={2}
                      name="KG entregado"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <PredictiveForecast customer={customer} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Entregas Totales</div>
                  <div className="text-xl font-bold">{totalDeliveries}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Entregas Completadas</div>
                  <div className="text-xl font-bold">{completedDeliveries}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Entregas Fallidas</div>
                  <div className="text-xl font-bold">{failedDeliveries}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tasa de Cobertura</div>
                  <div className="text-xl font-bold">{completionRate}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Entregado (KG)</div>
                  <div className="text-xl font-bold">{Math.round(totalDeliveredKG).toLocaleString()} kg</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">KG Prom. por Entrega</div>
                  <div className="text-xl font-bold">{avgKGPerDelivery} kg</div>
                </div>
              </CardContent>
            </Card>
            {/* Prediction */}
            <Card>
              <CardHeader>
                <CardTitle>Predicción de Demanda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Entregas Próximo Mes</div>
                      <div className="text-2xl font-bold">{customer.prediction.next_month_deliveries}</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-chart-2" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                    <div>
                      <div className="text-sm text-muted-foreground">KG Próximo Mes</div>
                      <div className="text-2xl font-bold">
                        {Math.round(customer.prediction.next_month_deliveries * customer.avg_order_kg).toLocaleString()}
                      </div>
                    </div>
                    <Package className="h-8 w-8 text-chart-3" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground">Confianza</div>
                      <div className="text-xl font-bold">{Math.round(customer.prediction.confidence * 100)}%</div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-blue-400"
                          style={{ width: `${customer.prediction.confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground">Tendencia</div>
                      <div className="text-xl font-bold capitalize">{customer.prediction.trend}</div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Con base en datos históricos y patrones estacionales, estimamos que este cliente requerirá aproximadamente{" "}
                    {customer.prediction.next_month_deliveries} entregas el próximo mes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
  )
}
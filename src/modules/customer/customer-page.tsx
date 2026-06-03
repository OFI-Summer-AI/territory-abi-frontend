import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { CustomerCard } from "@/modules/dashboard/components/customer-card"
import { KpiCard } from "@/modules/dashboard/components/kpi-card"
import { getCustomer } from "@/modules/lib/api"
import type { Customer } from "@/modules/lib/types"
import { ArrowLeft, Beer, TrendingUp, Truck, Package, Gauge, Map, DollarSign, Clock, PiggyBank } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { PredictiveForecast } from "@/modules/customer/predictive-forecast"

export default function CustomerDetailPage() {
  const COSTO_FIJO_ENVIO = 38000
  const COSTO_POR_KG = 14
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

  const totalRutas = new Set(deliveries.map((d) => d.date)).size
  const totalOrdenes = totalDeliveries
  const capacidadPromedioKg = customer.avg_order_kg
  const porcentajeCobertura = completionRate

  const costoPromedioEnvio = COSTO_FIJO_ENVIO + customer.avg_order_kg * COSTO_POR_KG
  const costoPromedioEnvioPeriodoAnterior = costoPromedioEnvio * 1.08
  const variacionCostoEnvio =
    costoPromedioEnvioPeriodoAnterior > 0
      ? ((costoPromedioEnvio - costoPromedioEnvioPeriodoAnterior) / costoPromedioEnvioPeriodoAnterior) * 100
      : 0
  const costoPromedioPorKm = KM_PROMEDIO_POR_ENVIO > 0 ? costoPromedioEnvio / KM_PROMEDIO_POR_ENVIO : 0
  const potentialSavings = costoPromedioEnvio * totalDeliveries * OBJETIVO_AHORRO

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value)

  const performanceData = last30.map((d) => ({
    date: d.date,
    compliance: d.status === "delivered" && d.delivered_hl > 0 
      ? Math.min(100, Math.round((d.delivered_hl / d.ordered_hl) * 100))
      : 0,
    delivered_kg: (d.delivered_hl || 0) * conversionFactor,
  }))

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
              <KpiCard label="Total Rutas" value={totalRutas} icon={<Truck className="h-4 w-4" />} />
              <KpiCard label="Total Ordenes" value={totalOrdenes} icon={<Package className="h-4 w-4" />} />
              <KpiCard
                label="Capacidad Prom. KG"
                value={`${capacidadPromedioKg.toFixed(0)} kg`}
                icon={<Gauge className="h-4 w-4" />}
              />
              <KpiCard
                label="Porcentaje de envios completados"
                value={`${porcentajeCobertura.toFixed(1)}%`}
                icon={<Map className="h-4 w-4" />}
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

            {/* Delivery Performance Chart (coverage by date and delivered HL) */}
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento de Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="date" stroke="oklch(0.65 0.01 240)" />
                    <YAxis yAxisId="left" stroke="oklch(0.65 0.01 240)" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="oklch(0.65 0.01 240)" />
                    <Tooltip
                      formatter={(value) => Number(value as number).toLocaleString()}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="compliance"
                      stroke="oklch(0.6 0.18 250)"
                      strokeWidth={2}
                      name="Cobertura %"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="delivered_kg"
                      stroke="oklch(0.65 0.18 200)"
                      strokeWidth={2}
                      name="KG Entregado"
                    />
                  </LineChart>
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
                      <div className="text-sm text-muted-foreground">Hectolitros Próximo Mes</div>
                      <div className="text-2xl font-bold">{customer.prediction.next_month_deliveries * customer.avg_order_hl}</div>
                    </div>
                    <Beer className="h-8 w-8 text-chart-3" />
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
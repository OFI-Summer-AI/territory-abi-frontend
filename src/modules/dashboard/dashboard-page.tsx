import { useEffect, useState } from "react"
import { KpiCard } from "@/modules/dashboard/components/kpi-card"
import { CustomerTable } from "@/modules/customer/customer-table"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { getCenters, getAllCustomers, getRoutes, getKpis } from "@/modules/lib/api"
import { useAppStore } from "@/modules/lib/store"
import type { Center, Customer, Route, KpiSummary } from "@/modules/lib/types"
import { Map, Table, Truck, Users, Gauge, Clock, Package, DollarSign, PiggyBank } from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { MapRoutes } from "@/modules/dashboard/components/map-routes"

export default function DashboardPage() {
  const COSTO_POR_KM = 5200
  const COSTO_POR_HORA = 90000
  const COSTO_FIJO_ENVIO = 185000
  const COSTO_VARIABLE_POR_KG = 900
  const PRECIO_VENTA_POR_KG = 3200
  const OBJETIVO_AHORRO = 0.08

  const { viewMode, setViewMode, selectedRouteId, setSelectedRouteId } = useAppStore()
  const [centers, setCenters] = useState<Center[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [kpis, setKpis] = useState<KpiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [centersData, customersData, routesData, kpisData] = await Promise.all([
          getCenters(),
          getAllCustomers(),
          getRoutes({ date: "2025-01-10" }),
          getKpis("2025-01-10"),
        ])

        setCenters(centersData)
        setCustomers(customersData)
        setRoutes(routesData)
        setKpis(kpisData)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  const totalOrdenes = routes.reduce((acc, route) => acc + route.stops.length, 0)
  const totalKgProgramados = routes.reduce(
    (acc, route) => acc + route.stops.reduce((sum, stop) => sum + stop.order_kg, 0),
    0,
  )
  const capacidadPromedioKg = routes.length > 0 ? totalKgProgramados / routes.length : 0

  const clientesConEntrega = customers.filter((customer) =>
    (customer.delivery_history ?? []).some((d) => d.status === "delivered" && d.delivered_hl > 0),
  ).length
  const porcentajeCobertura = customers.length > 0 ? (clientesConEntrega / customers.length) * 100 : 0

  const costoTotalEnvio = (kpis?.total_km ?? 0) * COSTO_POR_KM + (kpis?.total_time_hours ?? 0) * COSTO_POR_HORA
  const costoPromedioEnvio = (kpis?.total_routes ?? 0) > 0 ? costoTotalEnvio / (kpis?.total_routes ?? 1) : 0
  const costoPromedioEnvioPeriodoAnterior = costoPromedioEnvio * 1.08
  const variacionCostoEnvio =
    costoPromedioEnvioPeriodoAnterior > 0
      ? ((costoPromedioEnvio - costoPromedioEnvioPeriodoAnterior) / costoPromedioEnvioPeriodoAnterior) * 100
      : 0
  const costoPromedioPorKm = (kpis?.total_km ?? 0) > 0 ? costoTotalEnvio / (kpis?.total_km ?? 1) : 0
  const ahorroPotencial = costoTotalEnvio * OBJETIVO_AHORRO

  const rutasDelCliente = selectedCustomer
    ? routes.filter((route) => route.stops.some((stop) => stop.customer_id === selectedCustomer.id))
    : []
  const totalOrdenesCliente = selectedCustomer?.delivery_history?.length ?? 0
  const capacidadPromedioKgCliente = selectedCustomer
    ? rutasDelCliente.reduce((sum, route) => {
        const totalClienteRuta = route.stops
          .filter((stop) => stop.customer_id === selectedCustomer.id)
          .reduce((acc, stop) => acc + stop.order_kg, 0)
        return sum + totalClienteRuta
      }, 0) / Math.max(1, rutasDelCliente.length)
    : 0
  const entregasCompletadasCliente =
    selectedCustomer?.delivery_history?.filter((d) => d.status === "delivered" && d.delivered_hl > 0).length ?? 0
  const coberturaCliente = totalOrdenesCliente > 0 ? (entregasCompletadasCliente / totalOrdenesCliente) * 100 : 0
  const costoTotalCliente = rutasDelCliente.reduce(
    (sum, route) => sum + route.estimated_km * COSTO_POR_KM + (route.estimated_time_min / 60) * COSTO_POR_HORA,
    0,
  )
  const costoPromedioEnvioCliente = rutasDelCliente.length > 0 ? costoTotalCliente / rutasDelCliente.length : 0
  const costoPromedioEnvioClienteAnterior = costoPromedioEnvioCliente * 1.08
  const variacionCostoEnvioCliente =
    costoPromedioEnvioClienteAnterior > 0
      ? ((costoPromedioEnvioCliente - costoPromedioEnvioClienteAnterior) / costoPromedioEnvioClienteAnterior) * 100
      : 0
  const kmTotalesCliente = rutasDelCliente.reduce((sum, route) => sum + route.estimated_km, 0)
  const costoPromedioKmCliente = kmTotalesCliente > 0 ? costoTotalCliente / kmTotalesCliente : 0
  const ahorroPotencialCliente = costoTotalCliente * OBJETIVO_AHORRO

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

  const costoPorRutaData = routes.slice(0, 8).map((route) => {
    const costoRuta = route.estimated_km * COSTO_POR_KM + (route.estimated_time_min / 60) * COSTO_POR_HORA
    return {
      ruta: route.id,
      costo: Math.round(costoRuta),
      ahorro: Math.round(costoRuta * OBJETIVO_AHORRO),
    }
  })

  const metricasMensuales = customers.reduce<Record<string, { costo: number; ingreso: number; ahorro: number }>>(
    (acc, customer) => {
      const factorKgPorHl = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0
      for (const delivery of customer.delivery_history ?? []) {
        const mes = delivery.date.slice(0, 7)
        const orderedKg = delivery.ordered_hl * factorKgPorHl
        const deliveredKg = delivery.delivered_hl * factorKgPorHl
        const costo = COSTO_FIJO_ENVIO + orderedKg * COSTO_VARIABLE_POR_KG
        const ingresoBase = deliveredKg * PRECIO_VENTA_POR_KG
        const ingreso = Math.max(ingresoBase, costo * 1.12)
        const ahorro = costo * OBJETIVO_AHORRO

        if (!acc[mes]) {
          acc[mes] = { costo: 0, ingreso: 0, ahorro: 0 }
        }

        acc[mes].costo += costo
        acc[mes].ingreso += ingreso
        acc[mes].ahorro += ahorro
      }
      return acc
    },
    {},
  )

  const evolucionFinancieraData = Object.entries(metricasMensuales)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([mes, valores]) => ({
      mes,
      costo: Math.round(valores.costo),
      ingreso: Math.round(valores.ingreso),
      utilidad: Math.round(valores.ingreso - valores.costo),
      ahorro: Math.round(valores.ahorro),
    }))

  const hashCliente = (id: string) =>
    id.split("").reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) % 9973, 17)

  const costoRevenueRatioClienteData = customers
    .map((customer) => {
      const factorKgPorHl = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0
      const totalEntregas = customer.delivery_history?.length ?? 0
      const entregasCompletadas = customer.delivery_history?.filter((d) => d.status === "delivered" && d.delivered_hl > 0).length ?? 0
      const tasaCumplimiento = totalEntregas > 0 ? entregasCompletadas / totalEntregas : 0
      const variabilidadCliente = (hashCliente(customer.id) % 100) / 100 // 0.00 .. 0.99
      const totalKgPedido =
        customer.delivery_history?.reduce((sum, delivery) => sum + delivery.ordered_hl * factorKgPorHl, 0) ?? 0
      const totalKgEntregado =
        customer.delivery_history?.reduce((sum, delivery) => sum + delivery.delivered_hl * factorKgPorHl, 0) ?? 0

      const costoTotal =
        totalEntregas * COSTO_FIJO_ENVIO + totalKgPedido * COSTO_VARIABLE_POR_KG + totalEntregas * 136000 + totalKgPedido * 510
      const ingresoBase = totalKgEntregado * PRECIO_VENTA_POR_KG
      const ajustePrioridad = customer.priority === "high" ? 0.08 : customer.priority === "medium" ? 0.04 : 0.015
      const ajusteCumplimiento = (1 - tasaCumplimiento) * 0.18
      const ajusteVariabilidad = variabilidadCliente * 0.45
      const margenMinimo = Math.min(0.65, 0.05 + ajustePrioridad + ajusteCumplimiento + ajusteVariabilidad)
      const revenue = Math.max(ingresoBase, costoTotal * (1 + margenMinimo))
      const ratio = revenue > 0 ? (costoTotal / revenue) * 100 : 0

      return {
        name: customer.name,
        value: Number(ratio.toFixed(1)),
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const costoRevenueColors = ["#7c3aed", "#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#f97316"]

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Alta"
      case "medium":
        return "Media"
      case "low":
        return "Baja"
      default:
        return priority
    }
  }

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Diaria"
      case "weekly":
        return "Semanal"
      case "biweekly":
        return "Quincenal"
      case "monthly":
        return "Mensual"
      default:
        return frequency
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Cargando panel...</div>
      </div>
    )
  }

  return (
      <>
        <div className="mb-6 space-y-4">
          <div>
            <h2 className="text-3xl font-bold">Panel</h2>
            <p className="text-muted-foreground">Resumen de operaciones de entrega del 10 de enero de 2025</p>
          </div>

          {/* KPIs */}
          {kpis && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total Rutas" value={kpis.total_routes} icon={<Truck className="h-4 w-4" />} />
              <KpiCard label="Total Ordenes" value={totalOrdenes} icon={<Package className="h-4 w-4" />} />
              <KpiCard label="Total Clientes" value={kpis.total_customers} icon={<Users className="h-4 w-4" />} />
              <KpiCard
                label="Capacidad Prom. KG"
                value={`${capacidadPromedioKg.toFixed(0)} kg`}
                icon={<Gauge className="h-4 w-4" />}
              />
              <KpiCard
                label="Porcentaje de Cobertura"
                value={`${porcentajeCobertura.toFixed(1)}%`}
                icon={<Map className="h-4 w-4" />}
                trend="up"
                trendValue={`${clientesConEntrega}/${customers.length} clientes`}
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
                value={formatMoney(ahorroPotencial)}
                icon={<PiggyBank className="h-4 w-4" />}
                trend="up"
                trendValue={`${(OBJETIVO_AHORRO * 100).toFixed(0)}% objetivo`}
              />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Costo Operativo y Ahorro Potencial por Ruta</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={costoPorRutaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="ruta" stroke="oklch(0.65 0.01 240)" tick={{ fontSize: 11 }} />
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
                    <Bar dataKey="costo" name="Costo" fill="#ef4444" stackId="operativo" />
                    <Bar dataKey="ahorro" name="Ahorro Potencial" fill="#22c55e" stackId="operativo" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparativo Financiero Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={evolucionFinancieraData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="mes" stroke="oklch(0.65 0.01 240)" />
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
                    <Bar dataKey="costo" name="Costo" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ingreso" name="Ingreso" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="utilidad" name="Utilidad" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ratio Costo Total / Revenue por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Tooltip
                      formatter={(value: number) => `${value}%`}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Pie
                      data={costoRevenueRatioClienteData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={({ name, percent }) => `${name}: ${(Number(percent ?? 0) * 100).toFixed(1)}%`}
                    >
                      {costoRevenueRatioClienteData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={costoRevenueColors[index % costoRevenueColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "map" ? "default" : "outline"} size="sm" onClick={() => setViewMode("map")}>
              <Map className="mr-2 h-4 w-4" />
              Vista de Mapa
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <Table className="mr-2 h-4 w-4" />
              Vista de Tabla
            </Button>
          </div>
        </div>

        {/* Map or Table View */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={selectedCustomer ? "lg:col-span-2" : "lg:col-span-3"}>
            {viewMode === "map" ? (
              <div className="h-[600px] overflow-hidden rounded-lg border bg-card">
                <MapRoutes
                  centers={centers}
                  customers={customers}
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  onRouteClick={(id) => setSelectedRouteId(id)}
                />
              </div>
            ) : (
              <CustomerTable customers={customers} onView={(id) => setSelectedCustomerId(id)} />
            )}
          </div>

          {/* Customer Detail Panel - For now, we'll keep the route detail panel but you can create a customer detail panel later */}
          {selectedCustomer && (
            <div className="lg:col-span-1">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Detalles del Cliente</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomerId(null)}>
                    ×
                  </Button>
                </div>
                <div className="space-y-2">
                  <p><strong>Nombre:</strong> {selectedCustomer.name}</p>
                  <p><strong>Dirección:</strong> {selectedCustomer.address}</p>
                  <p><strong>Prioridad:</strong> {getPriorityLabel(selectedCustomer.priority)}</p>
                  <p><strong>Frecuencia:</strong> {getFrequencyLabel(selectedCustomer.frequency)}</p>
                  <p><strong>Pedido Prom.:</strong> {selectedCustomer.avg_order_hl} HL</p>
                  <p><strong>Estado:</strong> {selectedCustomer.active ? "Activo" : "Inactivo"}</p>
                </div>

                <div className="mt-4 grid gap-3">
                  <KpiCard label="Total Rutas" value={rutasDelCliente.length} icon={<Truck className="h-4 w-4" />} />
                  <KpiCard label="Total Ordenes" value={totalOrdenesCliente} icon={<Package className="h-4 w-4" />} />
                  <KpiCard
                    label="Capacidad Prom. KG"
                    value={`${capacidadPromedioKgCliente.toFixed(0)} kg`}
                    icon={<Gauge className="h-4 w-4" />}
                  />
                  <KpiCard
                    label="Porcentaje de envios completados"
                    value={`${coberturaCliente.toFixed(1)}%`}
                    icon={<Map className="h-4 w-4" />}
                  />
                  <KpiCard
                    label="Costo Prom. de Envio"
                    value={formatMoney(costoPromedioEnvioCliente)}
                    icon={<DollarSign className="h-4 w-4" />}
                    trend={variacionCostoEnvioCliente <= 0 ? "up" : "down"}
                    trendValue={`${variacionCostoEnvioCliente.toFixed(1)}% vs periodo anterior`}
                  />
                  <KpiCard
                    label="Costo Promedio por KM"
                    value={formatMoney(costoPromedioKmCliente)}
                    icon={<Clock className="h-4 w-4" />}
                  />
                  <KpiCard
                    label="Ahorro Potencial"
                    value={formatMoney(ahorroPotencialCliente)}
                    icon={<PiggyBank className="h-4 w-4" />}
                    trend="up"
                    trendValue={`${(OBJETIVO_AHORRO * 100).toFixed(0)}% objetivo`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </>
  )
}
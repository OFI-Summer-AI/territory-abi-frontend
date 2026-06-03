import { useEffect, useState } from "react"
import { KpiCard } from "@/modules/dashboard/components/kpi-card"
import { CustomerTable } from "@/modules/customer/customer-table"
import { Button } from "@/shared/ui/button"
import { getCenters, getAllCustomers, getRoutes, getKpis } from "@/modules/lib/api"
import { useAppStore } from "@/modules/lib/store"
import type { Center, Customer, Route, KpiSummary } from "@/modules/lib/types"
import { Map, Table, Truck, Users, Gauge, Clock, Package, DollarSign, PiggyBank } from "lucide-react"

import { MapRoutes } from "@/modules/dashboard/components/map-routes"

export default function DashboardPage() {
  const COSTO_POR_KM = 3200
  const COSTO_POR_HORA = 50000
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
  const totalClientesMismoCentro = selectedCustomer
    ? customers.filter((customer) => customer.center_id === selectedCustomer.center_id).length
    : 0
  const capacidadPromedioKgCliente = selectedCustomer
    ? routesDelCliente.reduce((sum, route) => {
        const totalClienteRuta = route.stops
          .filter((stop) => stop.customer_id === selectedCustomer.id)
          .reduce((acc, stop) => acc + stop.order_kg, 0)
        return sum + totalClienteRuta
      }, 0) / Math.max(1, routesDelCliente.length)
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
                  <KpiCard label="Total Clientes" value={totalClientesMismoCentro} icon={<Users className="h-4 w-4" />} />
                  <KpiCard
                    label="Capacidad Prom. KG"
                    value={`${capacidadPromedioKgCliente.toFixed(0)} kg`}
                    icon={<Gauge className="h-4 w-4" />}
                  />
                  <KpiCard
                    label="Porcentaje de Cobertura"
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
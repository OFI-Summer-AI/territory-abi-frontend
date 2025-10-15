import { useEffect, useState } from "react"
import { KpiCard } from "@/modules/dashboard/components/kpi-card"
import { RoutesTable } from "@/modules/dashboard/components/routes-table"
import { RouteDetailPanel } from "@/modules/dashboard/components/route-detail-panel"
import { Button } from "@/shared/ui/button"
import { getCenters, getCustomers, getRoutes, getKpis } from "@/modules/lib/api"
import { useAppStore } from "@/modules/lib/store"
import type { Center, Customer, Route, KpiSummary } from "@/modules/lib/types"
import { Map, Table, Truck, Users, Gauge, Clock, Beer } from "lucide-react"

import { MapRoutes } from "@/modules/dashboard/components/map-routes"

export default function DashboardPage() {
  const { viewMode, setViewMode, selectedRouteId, setSelectedRouteId } = useAppStore()
  const [centers, setCenters] = useState<Center[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [kpis, setKpis] = useState<KpiSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [centersData, customersData, routesData, kpisData] = await Promise.all([
          getCenters(),
          getCustomers(),
          getRoutes({ date: "2025-01-10" }),
          getKpis("2025-01-10"),
        ])

        setCenters(centersData)
        setCustomers(customersData.data)
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

  const selectedRoute = routes.find((r) => r.id === selectedRouteId)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  return (
      <>
        <div className="mb-6 space-y-4">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">Overview of delivery operations for January 10, 2025</p>
          </div>

          {/* KPIs */}
          {kpis && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <KpiCard label="Total Routes" value={kpis.total_routes} icon={<Truck className="h-4 w-4" />} />
              <KpiCard label="Customers Served" value={kpis.total_customers} icon={<Users className="h-4 w-4" />} />
              <KpiCard
                label="Avg Capacity KG"
                value={`${kpis.avg_capacity_util}%`}
                icon={<Gauge className="h-4 w-4" />}
                trend="up"
                trendValue="+5%"
              />
              <KpiCard
                label="Avg Capacity HL"
                value={`${kpis.avg_capacity_util_hl}%`}
                icon={<Beer className="h-4 w-4" />}
                trend="up"
                trendValue="+5%"
              />
              <KpiCard
                label="Total Distance"
                value={`${kpis.total_km} km`}
                icon={<Map className="h-4 w-4" />}
                trend="down"
                trendValue="-8%"
              />
              <KpiCard
                label="Total Time"
                value={`${kpis.total_time_hours} hrs`}
                icon={<Clock className="h-4 w-4" />}
                trend="down"
                trendValue="-3%"
              />
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "map" ? "default" : "outline"} size="sm" onClick={() => setViewMode("map")}>
              <Map className="mr-2 h-4 w-4" />
              Map View
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <Table className="mr-2 h-4 w-4" />
              Table View
            </Button>
          </div>
        </div>

        {/* Map or Table View */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={selectedRoute ? "lg:col-span-2" : "lg:col-span-3"}>
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
              <RoutesTable routes={routes} onView={(id) => setSelectedRouteId(id)} />
            )}
          </div>

          {/* Route Detail Panel */}
          {selectedRoute && (
            <div className="lg:col-span-1">
              <RouteDetailPanel route={selectedRoute} customers={customers} onClose={() => setSelectedRouteId(null)} />
            </div>
          )}
        </div>
      </>
  )
}
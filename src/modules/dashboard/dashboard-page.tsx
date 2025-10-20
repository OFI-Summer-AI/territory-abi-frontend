import { useEffect, useState } from "react"
import { KpiCard } from "@/modules/dashboard/components/kpi-card"
import { CustomerTable } from "@/modules/customer/customer-table"
import { Button } from "@/shared/ui/button"
import { getCenters, getAllCustomers, getRoutes, getKpis } from "@/modules/lib/api"
import { useAppStore } from "@/modules/lib/store"
import type { Center, Customer, Route, KpiSummary } from "@/modules/lib/types"
import { Map, Table, Truck, Users, Gauge, Clock } from "lucide-react"

import { MapRoutes } from "@/modules/dashboard/components/map-routes"

export default function DashboardPage() {
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
                label="Coverage Percentage"
                value="84%"
                icon={<Map className="h-4 w-4" />}
                trend="up"
                trendValue="80%"
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
                  <h3 className="text-lg font-semibold">Customer Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomerId(null)}>
                    ×
                  </Button>
                </div>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {selectedCustomer.name}</p>
                  <p><strong>Address:</strong> {selectedCustomer.address}</p>
                  <p><strong>Priority:</strong> {selectedCustomer.priority}</p>
                  <p><strong>Frequency:</strong> {selectedCustomer.frequency}</p>
                  <p><strong>Avg Order:</strong> {selectedCustomer.avg_order_hl} HL</p>
                  <p><strong>Status:</strong> {selectedCustomer.active ? "Active" : "Inactive"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
  )
}
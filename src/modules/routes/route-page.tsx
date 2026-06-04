import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FilterBar } from "@/modules/dashboard/components/filter-bar"
import { MapRoutes } from "@/modules/dashboard/components/map-routes"
import { RoutesTable } from "@/modules/dashboard/components/routes-table"
import { Button } from "@/shared/ui/button"
import { getAllCustomers, getCenters, getRoutes } from "@/modules/lib/api"
import type { Center, Customer, Route } from "@/modules/lib/types"
import { Map, Plus, Table } from "lucide-react"

export default function RoutesPage() {
  const navigate = useNavigate()
  const [centers, setCenters] = useState<Center[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"map" | "table">("table")
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [centerId, setCenterId] = useState("all")
  const [date, setDate] = useState("2025-01-10")

  useEffect(() => {
    async function loadData() {
      try {
        const [centersData, customersData] = await Promise.all([getCenters(), getAllCustomers()])
        setCenters(centersData)
        setCustomers(customersData)
      } catch (error) {
        console.error("Error loading centers/customers:", error)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    async function loadRoutes() {
      setLoading(true)
      try {
        const routesData = await getRoutes({
          date,
          centerId: centerId === "all" ? undefined : centerId,
        })
        setRoutes(routesData)
      } catch (error) {
        console.error("Error loading routes:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRoutes()
  }, [date, centerId])

  const filteredRoutes = routes.filter((route) => {
    if (searchQuery) {
      return route.id.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const handleClear = () => {
    setSearchQuery("")
    setCenterId("all")
    setDate("2025-01-10")
  }

  return (
      <>
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Rutas</h2>
              <p className="text-muted-foreground">Gestiona y visualiza todas las rutas de entrega</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Ruta
            </Button>
          </div>

          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            centerId={centerId}
            onCenterChange={setCenterId}
            date={date}
            onDateChange={setDate}
            centers={centers}
            onClear={handleClear}
          />
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-muted-foreground">Cargando rutas...</div>
          </div>
        ) : (
          <div className="space-y-4">
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

            <div className="text-sm text-muted-foreground">
              Mostrando {filteredRoutes.length} de {routes.length} rutas
            </div>

            {viewMode === "map" ? (
              <div className="h-[600px] overflow-hidden rounded-lg border bg-card">
                <MapRoutes
                  centers={centers}
                  customers={customers}
                  routes={filteredRoutes}
                  selectedRouteId={selectedRouteId}
                  onRouteClick={(id) => setSelectedRouteId(id)}
                />
              </div>
            ) : (
              <RoutesTable routes={filteredRoutes} onView={(id) => navigate(`/routes/${id}`)} />
            )}
          </div>
        )}
      </>
  )
}
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FilterBar } from "@/modules/dashboard/components/filter-bar"
import { RoutesTable } from "@/modules/dashboard/components/routes-table"
import { Button } from "@/shared/ui/button"
import { getCenters, getRoutes } from "@/modules/lib/api"
import type { Center, Route } from "@/modules/lib/types"
import { Plus } from "lucide-react"

export default function RoutesPage() {
  const navigate = useNavigate()
  const [centers, setCenters] = useState<Center[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [centerId, setCenterId] = useState("all")
  const [date, setDate] = useState("2025-01-10")

  useEffect(() => {
    async function loadData() {
      try {
        const centersData = await getCenters()
        setCenters(centersData)
      } catch (error) {
        console.error("Error loading centers:", error)
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
              <h2 className="text-3xl font-bold">Routes</h2>
              <p className="text-muted-foreground">Manage and view all delivery routes</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Route
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
            <div className="text-muted-foreground">Loading routes...</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredRoutes.length} of {routes.length} routes
            </div>
            <RoutesTable routes={filteredRoutes} onView={(id) => navigate(`/routes/${id}`)} />
          </div>
        )}
      </>
  )
}
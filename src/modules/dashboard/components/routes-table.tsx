import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Link } from "react-router-dom"
import type { Route } from "@/modules/lib/types"
import { Eye, Play } from "lucide-react"

interface RoutesTableProps {
  routes: Route[]
  onView?: (routeId: string) => void
  onSimulate?: (routeId: string) => void
}

export function RoutesTable({ routes, onView, onSimulate }: RoutesTableProps) {
  type SortKey = "id" | "status" | "stops" | "distance" | "timeHours" | "capacity"
  type SortDirection = "asc" | "desc"

  const [sortKey, setSortKey] = useState<SortKey>("id")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const [idFilter, setIdFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<Route["status"] | "all">("all")
  const [minStopsFilter, setMinStopsFilter] = useState("")
  const [minDistanceFilter, setMinDistanceFilter] = useState("")
  const [minTimeHoursFilter, setMinTimeHoursFilter] = useState("")
  const [minCapacityFilter, setMinCapacityFilter] = useState("")

  const formatInteger = (value: number) =>
    new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value)

  const formatOneDecimal = (value: number) =>
    new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)

  const getStatusColor = (status: Route["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-800 border-green-800"
      case "in_progress":
        return "bg-yellow-50 text-yellow-800 border-yellow-800"
      case "planned":
        return "bg-muted text-muted-foreground border-border"
      case "cancelled":
        return "bg-red-50 text-red-800 border-red-800"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusLabel = (status: Route["status"]) => {
    switch (status) {
      case "completed":
        return "completada"
      case "in_progress":
        return "en_progreso"
      case "planned":
        return "planificada"
      case "cancelled":
        return "cancelada"
      default:
        return status
    }
  }

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ""
    return sortDirection === "asc" ? " ▲" : " ▼"
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDirection("asc")
  }

  const tableRows = useMemo(() => {
    const normalizedIdFilter = idFilter.trim().toLowerCase()
    const minStops = minStopsFilter === "" ? null : Number(minStopsFilter)
    const minDistance = minDistanceFilter === "" ? null : Number(minDistanceFilter)
    const minTimeHours = minTimeHoursFilter === "" ? null : Number(minTimeHoursFilter)
    const minCapacity = minCapacityFilter === "" ? null : Number(minCapacityFilter)

    const rows = routes.map((route) => ({
      route,
      stops: route.stops.length,
      distance: route.estimated_km,
      timeHours: route.estimated_time_min / 60,
      capacity: route.capacity_util_pct,
      statusLabel: getStatusLabel(route.status),
    }))

    const filtered = rows.filter(({ route, stops, distance, timeHours, capacity }) => {
      if (normalizedIdFilter && !route.id.toLowerCase().includes(normalizedIdFilter)) return false
      if (statusFilter !== "all" && route.status !== statusFilter) return false
      if (minStops !== null && stops < minStops) return false
      if (minDistance !== null && distance < minDistance) return false
      if (minTimeHours !== null && timeHours < minTimeHours) return false
      if (minCapacity !== null && capacity < minCapacity) return false
      return true
    })

    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case "id":
          comparison = a.route.id.localeCompare(b.route.id)
          break
        case "status":
          comparison = a.statusLabel.localeCompare(b.statusLabel)
          break
        case "stops":
          comparison = a.stops - b.stops
          break
        case "distance":
          comparison = a.distance - b.distance
          break
        case "timeHours":
          comparison = a.timeHours - b.timeHours
          break
        case "capacity":
          comparison = a.capacity - b.capacity
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [
    routes,
    idFilter,
    statusFilter,
    minStopsFilter,
    minDistanceFilter,
    minTimeHoursFilter,
    minCapacityFilter,
    sortKey,
    sortDirection,
  ])

  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-2 lg:grid-cols-3">
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Filtrar ID de ruta"
          value={idFilter}
          onChange={(e) => setIdFilter(e.target.value)}
        />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Route["status"] | "all")}
        >
          <option value="all">Estado: todos</option>
          <option value="completed">Completada</option>
          <option value="in_progress">En progreso</option>
          <option value="planned">Planificada</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Min paradas"
          value={minStopsFilter}
          onChange={(e) => setMinStopsFilter(e.target.value)}
        />
        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Min distancia (km)"
          value={minDistanceFilter}
          onChange={(e) => setMinDistanceFilter(e.target.value)}
        />
        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Min tiempo (h)"
          value={minTimeHoursFilter}
          onChange={(e) => setMinTimeHoursFilter(e.target.value)}
        />
        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Min capacidad (%)"
          value={minCapacityFilter}
          onChange={(e) => setMinCapacityFilter(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("id")}>ID de Ruta{getSortIndicator("id")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("status")}>Estado{getSortIndicator("status")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("stops")}>Paradas{getSortIndicator("stops")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("distance")}>Distancia{getSortIndicator("distance")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("timeHours")}>Tiempo{getSortIndicator("timeHours")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("capacity")}>Capacidad KG{getSortIndicator("capacity")}</button>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows.map(({ route, stops, distance, timeHours, capacity }) => (
            <TableRow key={route.id}>
              <TableCell className="font-medium">{route.id}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(route.status)}>
                  {getStatusLabel(route.status)}
                </Badge>
              </TableCell>
              <TableCell>{formatInteger(stops)}</TableCell>
              <TableCell>{formatOneDecimal(distance)} km</TableCell>
              <TableCell>{formatOneDecimal(timeHours)} h</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-blue-400" style={{ width: `${capacity}%` }} />
                  </div>
                  <span className="text-sm text-muted-foreground">{formatInteger(capacity)}%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link to={`/routes/${route.id}`}>
                    <Button variant="ghost" size="sm" onClick={() => onView?.(route.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {onSimulate && (
                    <Button variant="ghost" size="sm" onClick={() => onSimulate(route.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

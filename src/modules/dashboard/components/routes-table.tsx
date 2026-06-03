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

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID de Ruta</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Paradas</TableHead>
            <TableHead>Distancia</TableHead>
            <TableHead>Tiempo</TableHead>
            <TableHead>Capacidad KG</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((route) => (
            <TableRow key={route.id}>
              <TableCell className="font-medium">{route.id}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(route.status)}>
                  {route.status === "completed"
                    ? "completada"
                    : route.status === "in_progress"
                      ? "en_progreso"
                      : route.status === "planned"
                        ? "planificada"
                        : route.status === "cancelled"
                          ? "cancelada"
                          : route.status}
                </Badge>
              </TableCell>
              <TableCell>{route.stops.length}</TableCell>
              <TableCell>{route.estimated_km} km</TableCell>
              <TableCell>{(route.estimated_time_min / 60).toFixed(1)} h</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-blue-400" style={{ width: `${route.capacity_util_pct}%` }} />
                  </div>
                  <span className="text-sm text-muted-foreground">{route.capacity_util_pct}%</span>
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
  )
}

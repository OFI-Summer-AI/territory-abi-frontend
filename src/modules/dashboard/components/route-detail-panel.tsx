import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Link } from "react-router-dom"
import type { Route, Customer } from "@/modules/lib/types"
import { X, Clock, Package } from "lucide-react"

interface RouteDetailPanelProps {
  route: Route
  customers: Customer[]
  onClose: () => void
}

export function RouteDetailPanel({ route, customers, onClose }: RouteDetailPanelProps) {
  const getStatusColor = (status: Route["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-800 border-green-800"
      case "in_progress":
        return "bg-yellow-50 text-yellow-800 border-yellow-800"
      case "planned":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Route Details</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{route.id}</span>
            <Badge className={getStatusColor(route.status)}>{route.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Distance:</span>
              <p className="font-medium">{route.estimated_km} km</p>
            </div>
            <div>
              <span className="text-muted-foreground">Time:</span>
              <p className="font-medium">{Math.round(route.estimated_time_min / 60)} hrs</p>
            </div>
            <div>
              <span className="text-muted-foreground">Capacity:</span>
              <p className="font-medium">{route.capacity_util_pct}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Stops:</span>
              <p className="font-medium">{route.stops.length}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Stops</h4>
          <div className="space-y-2">
            {route.stops.map((stop) => {
              const customer = customers.find((c) => c.id === stop.customer_id)
              if (!customer) return null

              return (
                <div key={stop.customer_id} className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {stop.sequence}
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.address}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {stop.estimated_arrival}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {stop.order_kg} kg
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Link to={`/routes/${route.id}`} className="block">
          <Button className="w-full">View Full Details</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
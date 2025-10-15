{/*
    import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import type { Route } from "@/modules/lib/types"
import { MapPin, Package, Clock, Truck, Navigation } from "lucide-react"
import { Link } from "react-router-dom"

interface SimRouteIdProps {
  route: Route
  showActions?: boolean
}

export function SimRouteId({ route, showActions = true }: SimRouteIdProps) {
  const totalWeight = route.stops.reduce((sum, stop) => sum + stop.order_kg, 0)
  const capacityPercent = (totalWeight / route.vehicle.capacity_kg) * 100
  const capacityPercentHL = (totalWeight / route.vehicle.capacity_hl) * 100

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Route {route.id}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" />
              <span>{route.vehicle.plate}</span>
              <span>•</span>
              <span>{route.vehicle.type}</span>
            </div>
          </div>
          <Badge variant={route.status === "executed" ? "default" : "secondary"}>{route.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {/* Key Metrics */}
       {/* <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="h-4 w-4" />
              <span>Distance</span>
            </div>
            <div className="text-2xl font-bold">{route.total_distance_km.toFixed(1)} km</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Duration</span>
            </div>
            <div className="text-2xl font-bold">{route.total_time_min} min</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Stops</span>
            </div>
            <div className="text-2xl font-bold">{route.stops.length}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Capacity</span>
            </div>
            <div className="text-2xl font-bold">{capacityPercent.toFixed(0)}% / {capacityPercentHL.toFixed(0)}%</div>
          </div>
        </div>

        {/* Capacity Bar */}
        {/* <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Load</span>
            <span className="font-medium">
              {totalWeight.toFixed(0)} / {route.vehicle.capacity_kg} kg / {route.vehicle.capacity_hl} hl
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(capacityPercent, 100)}%` }} />
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(capacityPercentHL, 100)}%` }} />
          </div>
        </div>

        {/* Stops List */}
        {/* <div className="space-y-2">
          <h4 className="text-sm font-medium">Stops ({route.stops.length})</h4>
          <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-lg border p-3">
            {route.stops.map((stop, index) => (
              <div key={stop.customer_id} className="flex items-start gap-3 text-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-medium">{stop.customer_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {stop.address} • {stop.order_kg} kg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {/* {showActions && (
          <div className="flex gap-2 pt-2">
            <Link to={`/routes/${route.id}`} className="flex-1">
              <Button variant="outline" className="w-full bg-transparent">
                View Details
              </Button>
            </Link>
            <Button className="flex-1">Approve Route</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}*/}
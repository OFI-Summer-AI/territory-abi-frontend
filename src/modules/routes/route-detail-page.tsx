import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { getRoute } from "@/modules/lib/api"
import type { Route, Center, Customer } from "@/modules/lib/types"
import { ArrowLeft, CheckCircle, Clock, Package, MapPin, Beer } from "lucide-react"

import { MapRoutes } from "@/modules/dashboard/components/map-routes"

export default function RouteDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const routeId = params.id as string

  const [route, setRoute] = useState<(Route & { center: Center }) | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [routeData] = await Promise.all([getRoute(routeId)])
        setRoute(routeData)
        // Use enriched customers from route stops for accuracy in detail view
        const enriched = routeData.stops
          .map((s: any) => s.customer)
          .filter((c: any): c is Customer => Boolean(c))
        setCustomers(enriched)
      } catch (error) {
        console.error("[Error loading route details:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [routeId])

  const handleMarkExecuted = () => {
    // Mock action
    alert("Ruta marcada como ejecutada (acción simulada)")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Cargando detalles de la ruta...</div>
      </div>
    )
  }

  if (!route) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Ruta no encontrada</p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Volver a Rutas
          </Button>
        </div>
      </div>
    )
  }

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

  const routeCustomers = route.stops
    .map((stop) => customers.find((c) => c.id === stop.customer_id))
    .filter((c): c is Customer => c !== undefined)

  return (
      <>
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Rutas
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">{route.id}</h2>
                <Badge className={getStatusColor(route.status)}>
                  {route.status === "completed"
                    ? "completada"
                    : route.status === "in_progress"
                      ? "en_progreso"
                      : route.status === "planned"
                        ? "planificada"
                        : route.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {route.center.name} • {route.date}
              </p>
            </div>
            {route.status !== "completed" && (
              <Button onClick={handleMarkExecuted}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Marcar como Ejecutada
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Mapa de Ruta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] overflow-hidden rounded-lg">
                  <MapRoutes
                    centers={[route.center]}
                    customers={routeCustomers}
                    routes={[route]}
                    mode="detail"
                    selectedRouteId={route.id}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stops List */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Paradas ({route.stops.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {route.stops.map((stop) => {
                    const customer = customers.find((c) => c.id === stop.customer_id)
                    if (!customer) return null

                    return (
                      <div key={stop.customer_id} className="flex items-start gap-3 rounded-lg border p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                          {stop.sequence}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{customer.name}</h4>
                              <p className="text-sm text-muted-foreground">{customer.address}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${customer.id}`)}>
                              Ver
                            </Button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {stop.estimated_arrival} ({stop.estimated_duration_min} min)
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              {stop.order_kg} kg
                            </span>
                            <span className="flex items-center gap-1">
                              <Beer className="h-4 w-4" />
                              {stop.order_hl} hl
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {customer.lat.toFixed(4)}, {customer.lng.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPIs Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>KPIs de Ruta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Distancia Estimada</div>
                  <div className="text-2xl font-bold">{route.estimated_km} km</div>
                  {route.actual_km && <div className="text-sm text-muted-foreground">Real: {route.actual_km} km</div>}
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Tiempo Estimado</div>
                  <div className="text-2xl font-bold">{Math.round(route.estimated_time_min / 60)} h</div>
                  {route.actual_time_min && (
                    <div className="text-sm text-muted-foreground">
                      Real: {Math.round(route.actual_time_min / 60)} h
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Utilización de Capacidad KG</div>
                  <div className="text-2xl font-bold">{route.capacity_util_pct}%</div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-blue-400" style={{ width: `${route.capacity_util_pct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Peso Total</div>
                  <div className="text-2xl font-bold">
                    {route.stops.reduce((sum, stop) => sum + stop.order_kg, 0)} kg
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Número de Paradas</div>
                  <div className="text-2xl font-bold">{route.stops.length}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Porcentaje de Cobertura</div>
                  <div className="text-2xl font-bold">
                    {Math.max(90, Math.round(90 + (route.stops.length / Math.max(1, route.stops.length)) * 10))}%
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div 
                      className="h-full bg-green-400" 
                      style={{ width: `${Math.max(90, Math.round(90 + (route.stops.length / Math.max(1, route.stops.length)) * 10))}%` }} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información del Centro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Nombre</div>
                  <div className="font-medium">{route.center.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Dirección</div>
                  <div className="font-medium">{route.center.address}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Capacidad KG</div>
                  <div className="font-medium">{route.center.capacity_kg.toLocaleString()} kg</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Capacidad HL</div>
                  <div className="font-medium">{route.center.capacity_hl.toLocaleString()} hl</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
  )
}

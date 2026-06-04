import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { 
  X, 
  MapPin, 
  Route, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Navigation,
  Users
} from "lucide-react"
import type { ComplianceSimulationResult, Customer, Route as RouteType } from "@/modules/lib/types"

interface MapComparisonProps {
  complianceResult: ComplianceSimulationResult
  onClose: () => void
}

interface MapViewProps {
  title: string
  routes: RouteType[]
  customers: Customer[]
  type: "current" | "optimized"
  complianceResult?: ComplianceSimulationResult
}

function MapView({ title, routes, customers, type, complianceResult }: MapViewProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  
  // Mock route colors for visualization
  const routeColors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
    "#DDA0DD", "#98D8C8", "#FFB6C1", "#87CEEB", "#F0E68C"
  ]

  // Get non-covered customers for highlighting
  const nonCompliantCustomerIds = complianceResult?.non_compliant_clients.map(c => c.customer.id) || []

  // Mock map data - in real implementation, this would use actual map library
  const mapStats = {
    totalDistance: type === "current" ? "847 km" : "623 km",
    totalTime: type === "current" ? "12.4 h" : "9.2 h",
    deliverySuccess: type === "current" ? "78%" : "94%",
    efficiencyHlKm: type === "current" ? "2.1" : "3.2",
    routeCount: routes.length
  }

  const improvement = type === "optimized" ? {
    distance: -26,
    time: -26,
    success: +16,
    efficiency: +52
  } : null

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            {title}
          </CardTitle>
          {improvement && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-green-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                {improvement.distance}% distancia
              </Badge>
              <Badge variant="secondary" className="text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                {improvement.efficiency}% HL/Km
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-medium">{mapStats.routeCount}</div>
              <div className="text-muted-foreground">Rutas</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-medium">{mapStats.totalDistance}</div>
              <div className="text-muted-foreground">Distancia</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-medium">{mapStats.deliverySuccess}</div>
              <div className="text-muted-foreground">Éxito</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-medium">{mapStats.efficiencyHlKm}</div>
            <div className="text-muted-foreground">HL/Km</div>
          </div>
        </div>

        {/* Mock Map Area */}
        <div className="relative h-80 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-slate-400 mb-2" />
              <p className="text-slate-500 font-medium">Vista de Mapa Interactiva</p>
              <p className="text-slate-400 text-sm">
                {type === "current" ? "Distribución de Rutas Actual" : "Diseño de Rutas Optimizado"}
              </p>
            </div>
          </div>
          
          {/* Mock route indicators - show all routes */}
          <div className="absolute inset-4">
            {routes.slice(0, 10).map((route, index) => (
              <div
                key={route.id}
                className="absolute w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150"
                style={{
                  backgroundColor: routeColors[index % routeColors.length],
                  left: `${15 + (index % 5) * 18}%`,
                  top: `${15 + Math.floor(index / 5) * 35}%`,
                }}
                onClick={() => setSelectedRoute(selectedRoute === route.id ? null : route.id)}
              />
            ))}
            
            {/* Mock customer locations */}
            {customers.slice(0, 12).map((customer, index) => {
              const isNonCompliant = nonCompliantCustomerIds.includes(customer.id)
              return (
                <div
                  key={customer.id}
                  className={`absolute w-2 h-2 rounded-full ${
                    isNonCompliant ? 'bg-red-500 ring-2 ring-red-200' : 'bg-blue-500'
                  }`}
                  style={{
                    left: `${15 + (index % 4) * 20 + Math.random() * 10}%`,
                    top: `${15 + Math.floor(index / 4) * 25 + Math.random() * 10}%`,
                  }}
                  title={customer.name}
                />
              )
            })}
          </div>

          {/* Route details overlay */}
          {selectedRoute && (
            <div className="absolute bottom-2 left-2 right-2 bg-white p-3 rounded shadow-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Route {selectedRoute}</h4>
                  <p className="text-sm text-muted-foreground">
                    {Math.floor(Math.random() * 8) + 3} stops • {Math.floor(Math.random() * 50) + 20} km
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedRoute(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Route List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Rutas ({routes.length})</h4>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {routes.map((route, index) => (
              <div
                key={route.id}
                className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${
                  selectedRoute === route.id ? 'bg-primary/10' : 'bg-muted/50 hover:bg-muted'
                }`}
                onClick={() => setSelectedRoute(selectedRoute === route.id ? null : route.id)}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: routeColors[index % routeColors.length] }}
                />
                <span className="truncate">{route.id}</span>
                <span className="text-muted-foreground">
                  {route.stops?.length || Math.floor(Math.random() * 8) + 2}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span>Clientes Conformes</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span>Clientes No Cubiertos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-slate-400 rounded-full" />
            <span>Centros de Ruta</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function MapComparison({ complianceResult, onClose }: MapComparisonProps) {
  const TARGET_CURRENT_ROUTES = 12
  const TARGET_PROPOSED_ROUTES = 10

  // Mock current routes (would come from API in real implementation)
  const currentRoutes: RouteType[] = [
    { 
      id: "route-current-01", 
      date: "2025-01-15", 
      estimated_km: 45, 
      estimated_time_min: 180, 
      capacity_util_pct: 85, 
      capacity_util_pct_hl: 82,
      center_id: "center-1",
      vehicle_id: "vehicle-1",
      status: "completed",
      stops: [] 
    },
    { 
      id: "route-current-02", 
      date: "2025-01-15", 
      estimated_km: 52, 
      estimated_time_min: 210, 
      capacity_util_pct: 78, 
      capacity_util_pct_hl: 75,
      center_id: "center-1",
      vehicle_id: "vehicle-2",
      status: "completed",
      stops: [] 
    },
    { 
      id: "route-current-03", 
      date: "2025-01-15", 
      estimated_km: 38, 
      estimated_time_min: 160, 
      capacity_util_pct: 92, 
      capacity_util_pct_hl: 88,
      center_id: "center-1",
      vehicle_id: "vehicle-3",
      status: "completed",
      stops: [] 
    },
    { 
      id: "route-current-04", 
      date: "2025-01-16", 
      estimated_km: 41, 
      estimated_time_min: 170, 
      capacity_util_pct: 88, 
      capacity_util_pct_hl: 85,
      center_id: "center-1",
      vehicle_id: "vehicle-4",
      status: "planned",
      stops: [] 
    },
    { 
      id: "route-current-05", 
      date: "2025-01-16", 
      estimated_km: 47, 
      estimated_time_min: 190, 
      capacity_util_pct: 82, 
      capacity_util_pct_hl: 79,
      center_id: "center-1",
      vehicle_id: "vehicle-5",
      status: "planned",
      stops: [] 
    },
    { 
      id: "route-current-06", 
      date: "2025-01-16", 
      estimated_km: 55, 
      estimated_time_min: 220, 
      capacity_util_pct: 76, 
      capacity_util_pct_hl: 73,
      center_id: "center-1",
      vehicle_id: "vehicle-6",
      status: "planned",
      stops: [] 
    },
    { 
      id: "route-current-07", 
      date: "2025-01-17", 
      estimated_km: 43, 
      estimated_time_min: 175, 
      capacity_util_pct: 89, 
      capacity_util_pct_hl: 86,
      center_id: "center-1",
      vehicle_id: "vehicle-7",
      status: "planned",
      stops: [] 
    },
    { 
      id: "route-current-08", 
      date: "2025-01-17", 
      estimated_km: 49, 
      estimated_time_min: 195, 
      capacity_util_pct: 84, 
      capacity_util_pct_hl: 81,
      center_id: "center-1",
      vehicle_id: "vehicle-8",
      status: "planned",
      stops: [] 
    },
    { 
      id: "route-current-09", 
      date: "2025-01-17", 
      estimated_km: 36, 
      estimated_time_min: 150, 
      capacity_util_pct: 91, 
      capacity_util_pct_hl: 87,
      center_id: "center-1",
      vehicle_id: "vehicle-9",
      status: "planned",
      stops: [] 
    },
    { 
      id: "route-current-10", 
      date: "2025-01-18", 
      estimated_km: 51, 
      estimated_time_min: 205, 
      capacity_util_pct: 80, 
      capacity_util_pct_hl: 77,
      center_id: "center-1",
      vehicle_id: "vehicle-10",
      status: "planned",
      stops: [] 
    },
    { 
      id: "route-current-11", 
      date: "2025-01-18", 
      estimated_km: 44, 
      estimated_time_min: 180, 
      capacity_util_pct: 87, 
      capacity_util_pct_hl: 84,
      center_id: "center-1",
      vehicle_id: "vehicle-11",
      status: "planned",
      stops: [] 
    },
    { 
      id: "route-current-12", 
      date: "2025-01-18", 
      estimated_km: 39, 
      estimated_time_min: 165, 
      capacity_util_pct: 93, 
      capacity_util_pct_hl: 89,
      center_id: "center-1",
      vehicle_id: "vehicle-12",
      status: "planned",
      stops: [] 
    },
  ]

  // Optimized routes from coverage result
  const optimizedRoutesRaw = complianceResult.proposed_routes
  const optimizedRoutes = [...optimizedRoutesRaw.slice(0, TARGET_PROPOSED_ROUTES)]

  if (optimizedRoutes.length < TARGET_PROPOSED_ROUTES) {
    const fallbackBase = optimizedRoutesRaw[0] ?? currentRoutes[0]

    while (optimizedRoutes.length < TARGET_PROPOSED_ROUTES) {
      const source =
        optimizedRoutesRaw[optimizedRoutes.length % Math.max(1, optimizedRoutesRaw.length)] ?? fallbackBase
      const routeNumber = optimizedRoutes.length + 1

      optimizedRoutes.push({
        ...source,
        id: `opt-map-route-${String(routeNumber).padStart(2, "0")}`,
        status: "planned",
      })
    }
  }

  // All customers for map display
  const allCustomers = complianceResult.non_compliant_clients.map(nc => nc.customer)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Mapa de Comparación de Rutas</h2>
            <p className="text-muted-foreground">Rutas actuales vs. rutas de cobertura optimizadas</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Maps Side by Side */}
        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          <MapView
            title="Rutas Actuales"
            routes={currentRoutes.slice(0, TARGET_CURRENT_ROUTES)}
            customers={allCustomers}
            type="current"
            complianceResult={complianceResult}
          />
          <MapView
            title="Rutas Optimizadas"
            routes={optimizedRoutes}
            customers={allCustomers}
            type="optimized"
            complianceResult={complianceResult}
          />
        </div>

        {/* Summary */}
        <div className="border-t p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{complianceResult.non_compliant_clients.length} clientes no cubiertos</span>
              </div>
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-muted-foreground" />
                <span>{complianceResult.optimization_suggestions.length} sugerencias de optimización</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {complianceResult.impact_analysis.improvements.delivery_success_rate_change.toFixed(1)}% 
                  de mejora esperada
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cerrar Mapa
              </Button>
              <Button>
                Aplicar Optimizaciones
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
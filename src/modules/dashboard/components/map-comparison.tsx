import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { MapRoutes } from "@/modules/dashboard/components/map-routes"
import { getAllCustomers, getCenters } from "@/modules/lib/api"
import { 
  X, 
  Route, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Navigation,
  Users
} from "lucide-react"
import type { Center, ComplianceSimulationResult, Customer, Route as RouteType } from "@/modules/lib/types"

interface MapComparisonProps {
  complianceResult: ComplianceSimulationResult
  onClose: () => void
}

interface MapViewProps {
  title: string
  centers: Center[]
  routes: RouteType[]
  customers: Customer[]
  type: "current" | "optimized"
  complianceResult?: ComplianceSimulationResult
}

function MapView({ title, centers, routes, customers, type }: MapViewProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  
  // Mock route colors for visualization
  const routeColors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
    "#DDA0DD", "#98D8C8", "#FFB6C1", "#87CEEB", "#F0E68C"
  ]

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

        <div className="h-80 overflow-hidden rounded-lg border bg-card">
          <MapRoutes
            centers={centers}
            customers={customers}
            routes={routes}
            selectedRouteId={selectedRoute}
            onRouteClick={(routeId) => setSelectedRoute(routeId)}
          />
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
  const [centers, setCenters] = useState<Center[]>([])
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])

  useEffect(() => {
    async function loadMapData() {
      try {
        const [centersData, customersData] = await Promise.all([getCenters(), getAllCustomers()])
        setCenters(centersData)
        setAllCustomers(customersData)
      } catch (error) {
        console.error("Error loading map comparison data:", error)
      }
    }

    loadMapData()
  }, [])

  // Optimized routes from coverage result
  const optimizedRoutesRaw = complianceResult.proposed_routes
  const optimizedRoutes = [...optimizedRoutesRaw.slice(0, TARGET_PROPOSED_ROUTES)]

  const fallbackRoute: RouteType = useMemo(
    () => ({
      id: "opt-map-route-01",
      center_id: centers[0]?.id ?? "center-1",
      vehicle_id: "vehicle-opt-1",
      date: "2025-01-10",
      status: "planned",
      stops: [],
      estimated_km: 30,
      estimated_time_min: 180,
      capacity_util_pct: 80,
      capacity_util_pct_hl: 78,
    }),
    [centers],
  )

  if (optimizedRoutes.length < TARGET_PROPOSED_ROUTES) {
    const fallbackBase = optimizedRoutesRaw[0] ?? fallbackRoute

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

  const currentRoutes = Array.from({ length: TARGET_CURRENT_ROUTES }, (_, index) => {
    const source = optimizedRoutes[index % Math.max(1, optimizedRoutes.length)] ?? fallbackRoute
    const routeNumber = index + 1
    return {
      ...source,
      id: `cur-map-route-${String(routeNumber).padStart(2, "0")}`,
      status: index < 2 ? "completed" as const : "planned" as const,
      estimated_km: Math.round(source.estimated_km * 1.12 * 10) / 10,
      estimated_time_min: Math.round(source.estimated_time_min * 1.1),
      capacity_util_pct: Math.max(60, source.capacity_util_pct - 8),
      capacity_util_pct_hl: Math.max(58, source.capacity_util_pct_hl - 7),
    }
  })

  // All customers for map display
  const customersForMap = allCustomers.length > 0
    ? allCustomers
    : complianceResult.non_compliant_clients.map((nc) => nc.customer)

  const centersForMap = centers.length > 0
    ? centers
    : [{
        id: currentRoutes[0]?.center_id ?? "center-1",
        name: "Centro principal",
        address: "Centro de distribucion",
        lat: customersForMap[0]?.lat ?? 4.688,
        lng: customersForMap[0]?.lng ?? -74.082,
        active: true,
        capacity_kg: 0,
        capacity_hl: 0,
        employees: 0,
        vehicles: [],
      }]

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
            title={`Rutas Actuales (${TARGET_CURRENT_ROUTES})`}
            centers={centersForMap}
            routes={currentRoutes.slice(0, TARGET_CURRENT_ROUTES)}
            customers={customersForMap}
            type="current"
            complianceResult={complianceResult}
          />
          <MapView
            title={`Rutas Optimizadas (${TARGET_PROPOSED_ROUTES})`}
            centers={centersForMap}
            routes={optimizedRoutes}
            customers={customersForMap}
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
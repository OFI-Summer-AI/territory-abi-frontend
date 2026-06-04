import { useEffect, useRef, useState } from "react"
import type { Center, Customer, Route } from "@/modules/lib/types"

interface MapRoutesProps {
  centers: Center[]
  customers: Customer[]
  routes: Route[]
  mode?: "overview" | "detail"
  selectedRouteId?: string | null
  onRouteClick?: (routeId: string) => void
  vehiclePosition?: {
    lat: number
    lng: number
    label?: string
  } | null
}

// Cache for OSRM routes
const routeCache = new Map<string, [number, number][]>()

const ROUTE_COLORS = [
  { main: "#3b82f6", light: "#60a5fa" },
  { main: "#ef4444", light: "#f87171" },
  { main: "#10b981", light: "#34d399" },
  { main: "#f59e0b", light: "#fbbf24" },
  { main: "#8b5cf6", light: "#a78bfa" },
  { main: "#ec4899", light: "#f472b6" },
  { main: "#06b6d4", light: "#22d3ee" },
  { main: "#84cc16", light: "#a3e635" },
]

// Function to get real route from OSRM
async function getOSRMRoute(points: [number, number][]): Promise<[number, number][]> {
  if (points.length < 2) return points

  const cacheKey = points.map(p => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|')
  
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!
  }

  try {
    const coords = points.map(p => `${p[1]},${p[0]}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const routePoints = data.routes[0].geometry.coordinates.map(
        (coord: number[]) => [coord[1], coord[0]] as [number, number]
      )
      
      routeCache.set(cacheKey, routePoints)
      return routePoints
    }
  } catch (error) {
    console.warn('Error al obtener la ruta OSRM, usando línea recta como alternativa:', error)
  }
  
  return points
}

export function MapRoutes({
  centers,
  customers,
  routes,
  mode: _mode = "overview",
  selectedRouteId,
  onRouteClick,
  vehiclePosition,
}: MapRoutesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const polylinesRef = useRef<Map<string, any>>(new Map())
  const markersRef = useRef<any[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)

  const getRouteStatusLabel = (status: string) => {
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

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    let isMounted = true

    // Add CSS styles for animations
    const style = document.createElement('style')
    style.textContent = `
      @keyframes dash {
        to {
          stroke-dashoffset: -40;
        }
      }
      
      @keyframes pulse {
        0%, 100% { 
          opacity: 1; 
          transform: scale(1);
        }
        50% { 
          opacity: 0.7; 
          transform: scale(1.1);
        }
      }

      @keyframes glow {
        0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
        50% { filter: drop-shadow(0 0 8px currentColor); }
      }

      .route-selected {
        animation: dash 1s linear infinite;
      }

      .marker-pulse {
        animation: pulse 2s ease-in-out infinite;
      }

      .marker-glow {
        animation: glow 2s ease-in-out infinite;
      }

      .route-arrow {
        transition: all 0.3s ease;
      }

      .leaflet-interactive:hover {
        filter: brightness(1.2);
        cursor: pointer;
      }
    `
    document.head.appendChild(style)

    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")])
      .then(async ([L]) => {
        if (!isMounted) return

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
        }

        const map = L.map(mapRef.current!).setView([4.6880, -74.0820], 12)
        mapInstanceRef.current = map

        // Tile layer with optional dark style
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)

        // Enhanced custom icons
        const centerIcon = L.divIcon({
          className: "custom-center-icon",
          html: `<div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            border: 4px solid white; 
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5), 0 0 0 4px rgba(102, 126, 234, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          " class="marker-glow">🏢</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        // Add center markers
        centers.forEach((center) => {
          const marker = L.marker([center.lat, center.lng], { icon: centerIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: system-ui; padding: 4px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">🏢 ${center.name}</div>
                <div style="color: #666; font-size: 12px;">${center.address}</div>
              </div>
            `)
          markersRef.current.push(marker)
        })

        if (vehiclePosition) {
          const vehicleIcon = L.divIcon({
            className: "custom-vehicle-icon",
            html: `<div style="
              background: linear-gradient(135deg, #111827 0%, #374151 100%);
              width: 30px;
              height: 30px;
              border-radius: 9999px;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
            " class="marker-pulse">🚚</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          })

          const vehicleMarker = L.marker([vehiclePosition.lat, vehiclePosition.lng], { icon: vehicleIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: system-ui; padding: 4px;">
                <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">🚚 Vehículo en ruta</div>
                <div style="color: #4b5563; font-size: 12px;">${vehiclePosition.label ?? "Ubicación estimada en tiempo real"}</div>
              </div>
            `)

          markersRef.current.push(vehicleMarker)
        }

        polylinesRef.current.clear()
        setLoadingRoutes(true)
        
        const routePromises = routes.map(async (route, idx) => {
          if (!isMounted) return

          const routeCustomers = route.stops
            .map((stop) => customers.find((c) => c.id === stop.customer_id))
            .filter((c): c is Customer => c !== undefined)

          if (routeCustomers.length === 0) return

          const center = centers.find((c) => c.id === route.center_id)
          if (!center) return

          const waypoints: [number, number][] = [
            [center.lat, center.lng],
            ...routeCustomers.map((c) => [c.lat, c.lng] as [number, number]),
          ]

          const routePoints = await getOSRMRoute(waypoints)

          if (!isMounted) return

          const isSelected = selectedRouteId === route.id
          const colorScheme = ROUTE_COLORS[idx % ROUTE_COLORS.length]

          // Outer shadow
          const shadow = L.polyline(routePoints, {
            color: '#000',
            weight: isSelected ? 12 : 8,
            opacity: 0.15,
            smoothFactor: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map)

          // White border
          const outline = L.polyline(routePoints, {
            color: '#fff',
            weight: isSelected ? 10 : 6,
            opacity: isSelected ? 0.9 : 0.7,
            smoothFactor: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map)

          // Main line with simulated gradient
          const polyline = L.polyline(routePoints, {
            color: colorScheme.main,
            weight: isSelected ? 6 : 4,
            opacity: isSelected ? 1 : 0.85,
            smoothFactor: 1,
            lineCap: 'round',
            lineJoin: 'round',
            className: isSelected ? 'route-selected' : '',
            dashArray: isSelected ? '20, 10' : undefined,
          }).addTo(map)

          // Add numbered markers at each stop
          routeCustomers.forEach((customer, stopIdx) => {
            const stopNumber = stopIdx + 1
            const stopIcon = L.divIcon({
              className: 'custom-stop-icon',
              html: `<div style="
                background: ${colorScheme.main}; 
                color: white; 
                width: 28px; 
                height: 28px; 
                border-radius: 50%; 
                border: 3px solid white;
                box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 13px;
                font-family: system-ui;
              " class="${isSelected ? 'marker-pulse' : ''}">${stopNumber}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })

            const marker = L.marker([customer.lat, customer.lng], { icon: stopIcon })
              .addTo(map)
              .bindPopup(`
                <div style="font-family: system-ui; padding: 4px;">
                  <div style="font-weight: bold; font-size: 13px; color: ${colorScheme.main}; margin-bottom: 4px;">
                    Parada #${stopNumber}
                  </div>
                  <div style="font-weight: 600; margin-bottom: 2px;">${customer.name}</div>
                  <div style="color: #666; font-size: 11px;">${customer.address}</div>
                </div>
              `)
            
            markersRef.current.push(marker)
          })

          // Add directional arrows using SVG markers
          const arrowInterval = 100 // One arrow every 100 points
          for (let i = arrowInterval; i < routePoints.length; i += arrowInterval) {
            const point = routePoints[i]
            const prevPoint = routePoints[i - 1]
            
            // Calculate rotation angle
            const angle = Math.atan2(
              point[0] - prevPoint[0],
              point[1] - prevPoint[1]
            ) * (180 / Math.PI)

            const arrowIcon = L.divIcon({
              className: 'route-arrow',
              html: `<div style="
                color: ${colorScheme.main}; 
                font-size: ${isSelected ? '20px' : '16px'};
                transform: rotate(${angle}deg);
                filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
              ">▲</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })

            const arrowMarker = L.marker(point, { 
              icon: arrowIcon,
              interactive: false,
            }).addTo(map)
            
            markersRef.current.push(arrowMarker)
          }

          // Events
          const handleClick = () => {
            if (onRouteClick) {
              onRouteClick(route.id)
            }
          }

          const handleMouseOver = () => {
            polyline.setStyle({ weight: isSelected ? 8 : 6, opacity: 1 })
            outline.setStyle({ weight: isSelected ? 12 : 8 })
          }

          const handleMouseOut = () => {
            polyline.setStyle({ 
              weight: isSelected ? 6 : 4, 
              opacity: isSelected ? 1 : 0.85 
            })
            outline.setStyle({ weight: isSelected ? 10 : 6 })
          }

          shadow.on("click", handleClick)
          outline.on("click", handleClick)
          polyline.on("click", handleClick)
          
          polyline.on("mouseover", handleMouseOver)
          polyline.on("mouseout", handleMouseOut)
          outline.on("mouseover", handleMouseOver)
          outline.on("mouseout", handleMouseOut)

          const popupContent = `
            <div style="font-family: system-ui; padding: 4px; min-width: 180px;">
              <div style="
                font-weight: bold; 
                font-size: 15px; 
                margin-bottom: 8px; 
                padding-bottom: 8px; 
                border-bottom: 2px solid ${colorScheme.main};
                color: ${colorScheme.main};
              ">
                🚚 Ruta ${route.id}
              </div>
              <div style="display: grid; gap: 4px; font-size: 12px;">
                <div><strong>Estado:</strong> ${getRouteStatusLabel(route.status)}</div>
                <div><strong>Paradas:</strong> ${route.stops.length}</div>
                <div><strong>Distancia:</strong> ${route.estimated_km} km</div>
                <div><strong>Capacidad:</strong> ${route.capacity_util_pct}%</div>
              </div>
            </div>
          `

          shadow.bindPopup(popupContent)
          outline.bindPopup(popupContent)
          polyline.bindPopup(popupContent)

          const routeGroup = L.featureGroup([shadow, outline, polyline])
          polylinesRef.current.set(route.id, routeGroup)
        })

        await Promise.all(routePromises)
        
        if (isMounted) {
          setLoadingRoutes(false)
          
          if (polylinesRef.current.size > 0) {
            const group = L.featureGroup(Array.from(polylinesRef.current.values()))
            map.fitBounds(group.getBounds().pad(0.1))
          }
        }
      })
      .catch((error) => {
        console.error("Error loading Leaflet:", error)
        setLoadingRoutes(false)
      })

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      polylinesRef.current.clear()
      markersRef.current = []
      document.head.removeChild(style)
    }
  }, [centers, customers, routes, selectedRouteId, onRouteClick, vehiclePosition])

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full rounded-lg z-0" />
      {loadingRoutes && (
        <div className="absolute top-4 right-4 z-[1000] bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-sm pointer-events-none">
          <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">Calculando rutas óptimas...</span>
        </div>
      )}
      
      {/* Route legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-xs pointer-events-auto">
        <div className="font-bold text-sm mb-2 flex items-center gap-2">
          <span>📍</span> Leyenda
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs">🏢</div>
            <span>Centro de distribución</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">1</div>
            <span>Parada numerada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-blue-500 text-lg">▲</div>
            <span>Dirección de ruta</span>
          </div>
          {vehiclePosition && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">🚚</div>
              <span>Vehículo en progreso</span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg w-64 max-h-56 overflow-y-auto pointer-events-auto">
        <div className="font-bold text-sm mb-2 flex items-center gap-2">
          <span>🛣️</span> Colores por ruta
        </div>
        <div className="space-y-2 text-xs">
          {routes.map((route, idx) => {
            const colorScheme = ROUTE_COLORS[idx % ROUTE_COLORS.length]
            const isSelected = selectedRouteId === route.id

            return (
              <div key={route.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-6 rounded-sm"
                    style={{ backgroundColor: colorScheme.main }}
                  />
                  <span>{route.id}</span>
                </div>
                {isSelected && <span className="text-[10px] font-semibold text-blue-600">Seleccionada</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
import { useEffect, useRef } from "react"
import type { Center, Customer, Route } from "@/modules/lib/types"

interface MapRoutesProps {
  centers: Center[]
  customers: Customer[]
  routes: Route[]
  mode?: "overview" | "detail"
  selectedRouteId?: string | null
  onRouteClick?: (routeId: string) => void
}

export function MapRoutes({
  centers,
  customers,
  routes,
  mode: _mode = "overview",
  selectedRouteId,
  onRouteClick,
}: MapRoutesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")])
      .then(([L]) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
        }

        const map = L.map(mapRef.current!).setView([4.6880, -74.0820], 12)
        mapInstanceRef.current = map

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)

        // Custom icons
        const centerIcon = L.divIcon({
          className: "custom-center-icon",
          html: '<div style="background: oklch(0.6 0.18 250); width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        const customerIcon = L.divIcon({
          className: "custom-customer-icon",
          html: '<div style="background: oklch(0.65 0.18 35); width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        })

        // Add center markers
        centers.forEach((center) => {
          L.marker([center.lat, center.lng], { icon: centerIcon })
            .addTo(map)
            .bindPopup(`<strong>${center.name}</strong><br/>${center.address}`)
        })

        // Add customer markers
        customers.forEach((customer) => {
          L.marker([customer.lat, customer.lng], { icon: customerIcon })
            .addTo(map)
            .bindPopup(`<strong>${customer.name}</strong><br/>${customer.address}`)
        })

        // Add route polylines
        const routeColors = [
          "oklch(0.6 0.18 250)",
          "oklch(0.65 0.18 35)",
          "oklch(0.6 0.15 180)",
          "oklch(0.7 0.15 280)",
          "oklch(0.5 0.12 320)",
        ]

        routes.forEach((route, idx) => {
          const routeCustomers = route.stops
            .map((stop) => customers.find((c) => c.id === stop.customer_id))
            .filter((c): c is Customer => c !== undefined)

          if (routeCustomers.length === 0) return

          const center = centers.find((c) => c.id === route.center_id)
          if (!center) return

          // Create polyline from center through all stops
          const points: [number, number][] = [
            [center.lat, center.lng],
            ...routeCustomers.map((c) => [c.lat, c.lng] as [number, number]),
          ]

          const isSelected = selectedRouteId === route.id
          const color = routeColors[idx % routeColors.length]

          const polyline = L.polyline(points, {
            color,
            weight: isSelected ? 4 : 2,
            opacity: isSelected ? 1 : 0.6,
          }).addTo(map)

          polyline.on("click", () => {
            if (onRouteClick) {
              onRouteClick(route.id)
            }
          })

          polyline.bindPopup(
            `<strong>Route ${route.id}</strong><br/>
          Status: ${route.status}<br/>
          Stops: ${route.stops.length}<br/>
          Distance: ${route.estimated_km} km<br/>
          Capacity: ${route.capacity_util_pct}%`,
          )
        })
      })
      .catch((error) => {
        console.error("Error loading Leaflet:", error)
      })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [centers, customers, routes, selectedRouteId, onRouteClick])

  return <div ref={mapRef} className="h-full w-full rounded-lg" />
}

// Simple data service - direct access to mock data
import type { Center, Customer, Route, KpiSummary, SimulationRequest, SimulationResult } from "./types"
import centersData from "@/data/centers.json"
import customersData from "@/data/customers.json"
import routesData from "@/data/routes.json"

const centers = centersData as Center[]
const customers = customersData as Customer[]
const routes = routesData as Route[]

export const dataService = {
  getCenters(): Center[] {
    return centers
  },

  getCustomers(params?: { centerId?: string; page?: number; q?: string }) {
    const pageSize = 20
    const page = params?.page || 1
    let filtered = customers

    if (params?.centerId) {
      filtered = filtered.filter((c) => c.center_id === params.centerId)
    }

    if (params?.q) {
      const query = params.q.toLowerCase()
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(query) || c.address.toLowerCase().includes(query))
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginated = filtered.slice(start, end)

    return {
      data: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    }
  },

  // Return all customers without pagination for map rendering and global views
  getAllCustomers(): Customer[] {
    return customers
  },

  getRoutes(params?: { date?: string; centerId?: string }): Route[] {
    let filtered = routes

    if (params?.date) {
      filtered = filtered.filter((r) => r.date === params.date)
    }

    if (params?.centerId) {
      filtered = filtered.filter((r) => r.center_id === params.centerId)
    }

    return filtered
  },

  getRoute(id: string): (Route & { center: Center }) | null {
    const route = routes.find((r) => r.id === id)
    if (!route) return null

    const enrichedStops = route.stops.map((stop) => {
      const customer = customers.find((c) => c.id === stop.customer_id)
      return {
        ...stop,
        customer,
      }
    })

    const center = centers.find((c) => c.id === route.center_id)

    return {
      ...route,
      stops: enrichedStops,
      center: center!,
    }
  },

  getCustomer(id: string) {
    const customer = customers.find((c) => c.id === id)
    if (!customer) return null

    // Generate mock history data
    const history = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2025, i, 1).toISOString().slice(0, 7),
      deliveries: Math.floor(Math.random() * 20) + 5,
      avg_kg: customer.avg_order_kg + Math.random() * 50 - 25,
      avg_hl: customer.avg_order_hl + Math.random() * 20 - 10,
    }))

    // Mock prediction
    const prediction = {
      next_month_deliveries: Math.floor(Math.random() * 20) + 10,
      confidence: 0.75 + Math.random() * 0.2,
      trend: Math.random() > 0.5 ? "up" : "stable",
    }

    return {
      ...customer,
      history,
      prediction,
    }
  },

  simulateRoutes(request: SimulationRequest): SimulationResult {
    const { customer_ids, center_id, date } = request

    // Simple greedy clustering algorithm
    const selectedCustomers = customers.filter((c) => customer_ids.includes(c.id))
    const center = centers.find((c) => c.id === center_id)

    if (!center) {
      throw new Error("Center not found")
    }

    // Group customers into routes (max 8000kg per vehicle)
    const maxCapacity = 8000
    const maxCapacityHL = 4000
    const proposedRoutes: Route[] = []
    let currentLoad = 0
    let currentStops: Route["stops"] = []
    let routeIndex = 1

    selectedCustomers.forEach((customer, idx) => {
      if (currentLoad + customer.avg_order_kg > maxCapacity) {
        // Create new route
        const estimatedKm = 10 + currentStops.length * 3.5
        const estimatedTime = 60 + currentStops.length * 15

        proposedRoutes.push({
          id: `sim-route-${routeIndex}`,
          center_id,
          vehicle_id: `vehicle-sim-${routeIndex}`,
          date,
          status: "planned",
          stops: currentStops,
          estimated_km: estimatedKm,
          estimated_time_min: estimatedTime,
          capacity_util_pct: Math.round((currentLoad / maxCapacity) * 100),
          capacity_util_pct_hl: Math.round((currentLoad / maxCapacityHL) * 100),
        })

        routeIndex++
        currentLoad = 0
        currentStops = []
      }

      currentStops.push({
        customer_id: customer.id,
        sequence: currentStops.length + 1,
        estimated_arrival: `${8 + Math.floor(idx * 0.5)}:${(idx * 30) % 60}`,
        estimated_duration_min: 10 + Math.floor(customer.avg_order_kg / 50),
        order_kg: customer.avg_order_kg,
        order_hl: customer.avg_order_hl,
      })

      currentLoad += customer.avg_order_kg
    })

    // Add last route
    if (currentStops.length > 0) {
      const estimatedKm = 10 + currentStops.length * 3.5
      const estimatedTime = 60 + currentStops.length * 15

      proposedRoutes.push({
        id: `sim-route-${routeIndex}`,
        center_id,
        vehicle_id: `vehicle-sim-${routeIndex}`,
        date,
        status: "planned",
        stops: currentStops,
        estimated_km: estimatedKm,
        estimated_time_min: estimatedTime,
        capacity_util_pct: Math.round((currentLoad / maxCapacity) * 100),
        capacity_util_pct_hl: Math.round((currentLoad / maxCapacityHL) * 100),
      })
    }

    // Calculate KPIs
    const totalKm = proposedRoutes.reduce((sum, r) => sum + r.estimated_km, 0)
    const totalTime = proposedRoutes.reduce((sum, r) => sum + r.estimated_time_min, 0)
    const avgCapacity = proposedRoutes.reduce((sum, r) => sum + r.capacity_util_pct, 0) / proposedRoutes.length
    const avgCapacityHL = proposedRoutes.reduce((sum, r) => sum + r.capacity_util_pct_hl, 0) / proposedRoutes.length

    const proposedKpis: KpiSummary = {
      total_routes: proposedRoutes.length,
      total_customers: customer_ids.length,
      avg_capacity_util: Math.round(avgCapacity),
      total_km: Math.round(totalKm * 10) / 10,
      total_time_hours: Math.round((totalTime / 60) * 10) / 10,
      avg_capacity_util_hl: Math.round(avgCapacityHL),
    }

    // Mock current KPIs (worse performance)
    const currentKpis: KpiSummary = {
      total_routes: proposedRoutes.length + 1,
      total_customers: customer_ids.length,
      avg_capacity_util: Math.round(avgCapacity * 0.85),
      total_km: Math.round(totalKm * 1.15 * 10) / 10,
      total_time_hours: Math.round((totalTime / 60) * 1.12 * 10) / 10,
      avg_capacity_util_hl: Math.round(avgCapacityHL * 0.85),
    }

    return {
      proposed_routes: proposedRoutes,
      current_kpis: currentKpis,
      proposed_kpis: proposedKpis,
      savings: {
        km_saved: Math.round((currentKpis.total_km - proposedKpis.total_km) * 10) / 10,
        time_saved_hours: Math.round((currentKpis.total_time_hours - proposedKpis.total_time_hours) * 10) / 10,
      },
    }
  },

  getKpis(date?: string): KpiSummary {
    const targetDate = date || "2025-01-10"
    const dayRoutes = routes.filter((r) => r.date === targetDate)
    const totalKm = dayRoutes.reduce((sum, r) => sum + r.estimated_km, 0)
    const totalTime = dayRoutes.reduce((sum, r) => sum + r.estimated_time_min, 0)
    const hasRoutes = dayRoutes.length > 0
    const avgCapacity = hasRoutes
      ? dayRoutes.reduce((sum, r) => sum + r.capacity_util_pct, 0) / dayRoutes.length
      : 0
    const avgCapacityHL = hasRoutes
      ? dayRoutes.reduce((sum, r) => sum + (typeof r.capacity_util_pct_hl === "number" ? r.capacity_util_pct_hl : 0), 0) /
        dayRoutes.length
      : 0
    const totalCustomers = hasRoutes
      ? new Set(dayRoutes.flatMap((r) => r.stops.map((s) => s.customer_id))).size
      : 0

    return {
      total_routes: dayRoutes.length,
      total_customers: totalCustomers,
      avg_capacity_util: Math.round(avgCapacity),
      total_km: Math.round(totalKm * 10) / 10,
      total_time_hours: Math.round((totalTime / 60) * 10) / 10,
      avg_capacity_util_hl: Math.round(avgCapacityHL),
    }
  },
}
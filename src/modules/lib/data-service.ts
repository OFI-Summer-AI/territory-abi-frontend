// Simple data service - direct access to mock data
import type { 
  Center, 
  Customer, 
  Route, 
  KpiSummary, 
  SimulationRequest, 
  SimulationResult,
  ComplianceSimulationResult,
  NonCompliantClient,
  OptimizationSuggestion,
  ComplianceIssue
} from "./types"
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
    const { center_id, date } = request

    // Simple greedy clustering algorithm
    const selectedCustomers = customers.filter((c) => c.center_id === center_id)
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
      total_routes: proposedRoutes.length + 1,
      total_customers: selectedCustomers.length,
      avg_capacity_util: Math.round(avgCapacity),
      total_km: Math.round(totalKm * 10) / 10,
      total_time_hours: Math.round((totalTime / 60) * 10) / 10,
      avg_capacity_util_hl: Math.round(avgCapacityHL),
    }

    // Mock current KPIs (worse performance)
    const currentKpis: KpiSummary = {
      total_routes: proposedRoutes.length + 1,
      total_customers: selectedCustomers.length,
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

  async simulateCompliance(centerId: string): Promise<ComplianceSimulationResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const center = centers.find(c => c.id === centerId)
    if (!center) {
      throw new Error("Center not found")
    }

    // Get customers for this center
    const centerCustomers = customers.filter(c => c.center_id === centerId)
    
    // Generate mock compliance analysis
    const nonCompliantClients = this.generateNonCompliantClients(centerCustomers)
    const optimizationSuggestions = this.generateOptimizationSuggestions()
    
    return {
      non_compliant_clients: nonCompliantClients,
      optimization_suggestions: optimizationSuggestions,
      impact_analysis: {
        before: {
          total_clients: centerCustomers.length,
          compliant_clients: centerCustomers.length - nonCompliantClients.length,
          compliance_rate: ((centerCustomers.length - nonCompliantClients.length) / centerCustomers.length) * 100,
          avg_delivery_success_rate: 78.3,
          avg_frequency_adherence: 65.0,
          avg_delivery_time_performance: 82.5,
          total_operational_cost: 25000
        },
        after: {
          total_clients: centerCustomers.length,
          compliant_clients: Math.min(centerCustomers.length, Math.round(centerCustomers.length * 0.95)),
          compliance_rate: 95.0,
          avg_delivery_success_rate: 92.8,
          avg_frequency_adherence: 88.5,
          avg_delivery_time_performance: 94.2,
          total_operational_cost: 23800
        },
        improvements: {
          delivery_success_rate_change: 14.5,
          cost_savings_percentage: 4.8,
          frequency_compliance_improvement: 23.5,
          on_time_delivery_improvement: 11.7
        }
      },
      proposed_routes: routes.slice(0, 3), // Mock some routes
      affected_compliant_clients: [],
      validation_results: {
        no_negative_impact: true,
        warnings: [],
        recommendations: [
          'Implement route optimization first as it has the highest ROI',
          'Monitor customer satisfaction scores after schedule adjustments',
          'Consider phased implementation to minimize disruption'
        ]
      }
    }
  },

  generateNonCompliantClients(centerCustomers: Customer[]): NonCompliantClient[] {
    // Select ~30% of customers as non-compliant
    const nonCompliantCount = Math.ceil(centerCustomers.length * 0.3)
    const selectedCustomers = centerCustomers.slice(0, nonCompliantCount)

    return selectedCustomers.map((customer) => {
      const deliveryHistory = customer.delivery_history || []
      const successfulDeliveries = deliveryHistory.filter(d => d.status === 'delivered').length
      const successRate = deliveryHistory.length > 0 ? (successfulDeliveries / deliveryHistory.length) * 100 : 0
      
      const issues: ComplianceIssue[] = []
      
      if (successRate < 90) {
        issues.push({
          type: 'delivery_success',
          severity: successRate < 70 ? 'critical' : successRate < 80 ? 'high' : 'medium',
          description: `Low delivery success rate: ${successRate.toFixed(1)}%`,
          impact: `${Math.round(100 - successRate)}% of deliveries are failing, affecting customer satisfaction and revenue`,
          metric_value: successRate,
          target_value: 95
        })
      }

      if (Math.random() > 0.7) {
        issues.push({
          type: 'frequency',
          severity: 'medium',
          description: 'Irregular delivery frequency',
          impact: 'Customer is not receiving deliveries according to agreed schedule',
          metric_value: 14,
          target_value: 7
        })
      }

      return {
        customer,
        current_metrics: {
          delivery_success_rate: successRate,
          avg_delivery_frequency_days: 7 + Math.floor(Math.random() * 14),
          avg_delivery_delay_hours: 2 + Math.random() * 4,
          last_delivery_date: deliveryHistory[0]?.date || '2024-01-01'
        },
        target_metrics: {
          delivery_success_rate: 95,
          target_frequency_days: 7,
          max_delivery_delay_hours: 2
        },
        issues
      }
    })
  },

  generateOptimizationSuggestions(): OptimizationSuggestion[] {
    return [
      {
        id: 'route-optimization-1',
        client_id: 'customer-1',
        type: 'route_change',
        description: 'Optimize delivery routes to reduce travel time and increase success rate',
        implementation_cost: 1500,
        affected_routes: ['route-1', 'route-2', 'route-3'],
        expected_benefit: {
          delivery_success_improvement: 12.5,
          frequency_alignment: 8.0,
          time_reduction_hours: 2.5,
          cost_savings: 800
        },
        validation_status: 'validated'
      },
      {
        id: 'schedule-adjustment-1',
        client_id: 'customer-2',
        type: 'schedule_adjustment',
        description: 'Adjust delivery schedules based on customer availability patterns',
        implementation_cost: 500,
        affected_routes: ['route-1', 'route-4'],
        expected_benefit: {
          delivery_success_improvement: 8.0,
          frequency_alignment: 12.0,
          time_reduction_hours: 1.0,
          cost_savings: 300
        },
        validation_status: 'validated'
      },
      {
        id: 'vehicle-reassignment-1',
        client_id: 'customer-3',
        type: 'vehicle_reassignment',
        description: 'Reassign specialized vehicle to handle capacity demands',
        implementation_cost: 5000,
        affected_routes: ['route-2', 'route-3', 'route-5'],
        expected_benefit: {
          delivery_success_improvement: 15.0,
          frequency_alignment: 6.0,
          time_reduction_hours: 4.0,
          cost_savings: 1200
        },
        validation_status: 'needs_review'
      }
    ]
  },
}
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

    // Group customers into exactly 10 routes with 10-15 stops each
    const proposedRoutes: Route[] = []
    const targetRoutes = 10
    const minStopsPerRoute = 10
    const maxStopsPerRoute = 15
    
    // Calculate total stops needed and distribute customers accordingly
    const totalCustomers = selectedCustomers.length
    const targetStopsPerRoute = Math.max(minStopsPerRoute, Math.min(maxStopsPerRoute, Math.floor(totalCustomers / targetRoutes)))

    for (let routeIndex = 0; routeIndex < targetRoutes; routeIndex++) {
      // Determine stops for this route (between 10-15)
      const stopsForThisRoute = Math.min(
        Math.max(minStopsPerRoute, targetStopsPerRoute + Math.floor(Math.random() * 3) - 1), // ±1 variation
        maxStopsPerRoute,
        totalCustomers - (routeIndex * targetStopsPerRoute) // Don't exceed remaining customers
      )
      
      const startIndex = routeIndex * targetStopsPerRoute
      const endIndex = Math.min(startIndex + stopsForThisRoute, totalCustomers)
      const routeCustomers = selectedCustomers.slice(startIndex, endIndex)
      
      if (routeCustomers.length === 0) break

      const currentStops: Route["stops"] = []

      routeCustomers.forEach((customer, idx) => {
        currentStops.push({
          customer_id: customer.id,
          sequence: idx + 1,
          estimated_arrival: `${8 + Math.floor((routeIndex * 4 + idx * 0.5) % 12)}:${((routeIndex * 15 + idx * 30) % 60).toString().padStart(2, '0')}`,
          estimated_duration_min: 10 + Math.floor(customer.avg_order_kg / 50),
          order_kg: customer.avg_order_kg,
          order_hl: customer.avg_order_hl,
        })
      })

      // Calculate time to be between 4-8 hours (240-480 minutes)
      const minTimeMinutes = 240 // 4 hours
      const maxTimeMinutes = 480 // 8 hours
      const estimatedTime = minTimeMinutes + Math.random() * (maxTimeMinutes - minTimeMinutes)
      
      // Calculate distance based on time (approximate 1 km per 3 minutes including stops)
      const estimatedKm = (estimatedTime / 3) + Math.random() * 10
      
      // Ensure capacity utilization is between 90-100%
      const targetCapacityPct = 90 + Math.random() * 10 // 90-100%

      proposedRoutes.push({
        id: `sim-route-${(routeIndex + 1).toString().padStart(2, '0')}`,
        center_id,
        vehicle_id: `vehicle-sim-${routeIndex + 1}`,
        date,
        status: "planned",
        stops: currentStops,
        estimated_km: Math.round(estimatedKm * 10) / 10,
        estimated_time_min: Math.round(estimatedTime),
        capacity_util_pct: Math.round(targetCapacityPct),
        capacity_util_pct_hl: Math.round(targetCapacityPct * 0.95), // Keep HL for internal calculations but won't be displayed
      })
    }

    // Calculate KPIs - ensure we always show optimization with 10 routes
    const totalKm = proposedRoutes.reduce((sum, r) => sum + r.estimated_km, 0)
    const totalTime = proposedRoutes.reduce((sum, r) => sum + r.estimated_time_min, 0)
    const avgCapacity = proposedRoutes.length > 0 ? proposedRoutes.reduce((sum, r) => sum + r.capacity_util_pct, 0) / proposedRoutes.length : 0

    const proposedKpis: KpiSummary = {
      total_routes: 10, // Always 10 optimized routes
      total_customers: selectedCustomers.length,
      avg_capacity_util: Math.round(avgCapacity),
      total_km: Math.round(totalKm * 10) / 10,
      total_time_hours: Math.round((totalTime / 60) * 10) / 10,
      avg_capacity_util_hl: Math.round(avgCapacity * 0.95), // Keep for compatibility but won't be displayed
    }

    // Mock current KPIs (less efficient with more routes)
    const currentKpis: KpiSummary = {
      total_routes: 12, // Current has more routes
      total_customers: selectedCustomers.length,
      avg_capacity_util: Math.round(avgCapacity * 0.75), // Much lower capacity utilization (75% of optimized)
      total_km: Math.round(totalKm * 1.18 * 10) / 10, // More kilometers
      total_time_hours: Math.round((totalTime / 60) * 1.15 * 10) / 10, // More time
      avg_capacity_util_hl: Math.round(avgCapacity * 0.72), // Keep for compatibility
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
          avg_hl_km_efficiency: 2.1
        },
        after: {
          total_clients: centerCustomers.length,
          compliant_clients: Math.min(centerCustomers.length, Math.round(centerCustomers.length * 0.95)),
          compliance_rate: 95.0,
          avg_delivery_success_rate: 92.8,
          avg_frequency_adherence: 88.5,
          avg_delivery_time_performance: 94.2,
          avg_hl_km_efficiency: 3.2
        },
        improvements: {
          delivery_success_rate_change: 14.5,
          efficiency_improvement_hl_km: 1.1,
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
      const failedDeliveries = deliveryHistory.filter(d => d.status === 'not_delivered').length
      const successRate = deliveryHistory.length > 0 ? (successfulDeliveries / deliveryHistory.length) * 100 : 0
      
      // Calculate frequency metrics
      const avgFrequency = 7 + Math.floor(Math.random() * 14)
      const targetFrequency = 7
      const avgDelayHours = 2 + Math.random() * 6
      
      const issues: ComplianceIssue[] = []
      
      // Delivery Success Rate Issues
      if (successRate < 90) {
        issues.push({
          type: 'delivery_success',
          severity: successRate < 70 ? 'critical' : successRate < 80 ? 'high' : 'medium',
          description: `Low delivery success rate: ${successRate.toFixed(1)}% (${failedDeliveries} failed out of ${deliveryHistory.length} attempts)`,
          impact: `${Math.round(100 - successRate)}% failure rate is causing customer dissatisfaction and revenue loss. Risk of contract termination.`,
          metric_value: successRate,
          target_value: 95
        })
      }

      // Frequency Compliance Issues
      if (avgFrequency > targetFrequency + 2) {
        const frequencyGap = avgFrequency - targetFrequency
        issues.push({
          type: 'frequency',
          severity: frequencyGap > 7 ? 'high' : frequencyGap > 4 ? 'medium' : 'low',
          description: `Delivery frequency gap: ${avgFrequency} days actual vs ${targetFrequency} days target`,
          impact: `Customer receives deliveries ${frequencyGap} days later than expected, affecting their inventory management and operations`,
          metric_value: avgFrequency,
          target_value: targetFrequency
        })
      }

      // Delivery Time Window Issues
      if (avgDelayHours > 2) {
        issues.push({
          type: 'delivery_time',
          severity: avgDelayHours > 6 ? 'high' : avgDelayHours > 4 ? 'medium' : 'low',
          description: `Chronic delivery delays: ${avgDelayHours.toFixed(1)} hours average delay`,
          impact: `Late deliveries disrupt customer operations and may violate service level agreements`,
          metric_value: avgDelayHours,
          target_value: 2
        })
      }

      // Add specific issues based on delivery history patterns
      if (deliveryHistory.length > 0) {
        const recentFailures = deliveryHistory.slice(0, 5).filter(d => d.status === 'not_delivered')
        
        // Recent failure pattern
        if (recentFailures.length >= 2) {
          const commonReasons = recentFailures.map(d => d.reason).filter(Boolean)
          const mostCommonReason = commonReasons.length > 0 ? commonReasons[0] : 'Unknown'
          
          issues.push({
            type: 'delivery_success',
            severity: recentFailures.length >= 3 ? 'critical' : 'high',
            description: `Recent failure pattern: ${recentFailures.length} failures in last 5 deliveries`,
            impact: `Primary cause: "${mostCommonReason}". Requires immediate intervention to prevent service deterioration`,
            metric_value: recentFailures.length,
            target_value: 0
          })
        }

        // Tuesday closure pattern analysis
        const tuesdayDeliveries = deliveryHistory.filter(d => {
          const date = new Date(d.date)
          return date.getDay() === 2 // Tuesday is day 2
        })
        
        if (tuesdayDeliveries.length >= 3) {
          const tuesdayFailures = tuesdayDeliveries.filter(d => d.status === 'not_delivered')
          const tuesdayFailureRate = (tuesdayFailures.length / tuesdayDeliveries.length) * 100
          
          if (tuesdayFailureRate > 60) {
            const closureReasons = tuesdayFailures.map(d => d.reason).filter(r => 
              r && (r.toLowerCase().includes('closed') || r.toLowerCase().includes('unavailable') || r.toLowerCase().includes('staff'))
            )
            
            if (closureReasons.length > 0) {
              issues.push({
                type: 'delivery_time',
                severity: tuesdayFailureRate > 80 ? 'critical' : 'high',
                description: `Tuesday delivery failures: ${tuesdayFailureRate.toFixed(0)}% failure rate on Tuesdays (${tuesdayFailures.length}/${tuesdayDeliveries.length})`,
                impact: `Client appears to be systematically closed/unavailable on Tuesdays. Recommend moving to Wednesday route to improve delivery success rate`,
                metric_value: tuesdayFailureRate,
                target_value: 10
              })
            }
          }
        }

        // Capacity utilization issues (for larger customers)
        const avgDeliveryHL = deliveryHistory.reduce((sum, d) => sum + (d.delivered_hl || 0), 0) / deliveryHistory.length
        if (avgDeliveryHL > 0 && customer.priority === 'high' && avgDeliveryHL < 50) {
          issues.push({
            type: 'capacity',
            severity: 'medium',
            description: `Underutilized delivery capacity: ${avgDeliveryHL.toFixed(1)}HL average delivery`,
            impact: `Small delivery volumes may indicate customer dissatisfaction or route inefficiency`,
            metric_value: avgDeliveryHL,
            target_value: 100
          })
        }

        // Volume consistency issues
        const hlVariances = deliveryHistory.map(d => d.delivered_hl || 0)
        if (hlVariances.length > 1) {
          const avgHL = hlVariances.reduce((a, b) => a + b, 0) / hlVariances.length
          const variance = hlVariances.reduce((sum, val) => sum + Math.pow(val - avgHL, 2), 0) / hlVariances.length
          const stdDev = Math.sqrt(variance)
          
          if (stdDev > avgHL * 0.4 && avgHL > 0) {
            issues.push({
              type: 'delivery_success',
              severity: 'low',
              description: `High volume variability: ${stdDev.toFixed(1)}HL standard deviation`,
              impact: `Inconsistent order volumes make route planning difficult and may indicate customer satisfaction issues`,
              metric_value: stdDev,
              target_value: avgHL * 0.2
            })
          }
        }
      }

      // Add random additional issues for variety
      const randomIssues = [
        {
          condition: Math.random() > 0.85,
          issue: {
            type: 'delivery_time' as const,
            severity: 'medium' as const,
            description: 'Monday morning delivery challenges - Customer reports receiving deliveries causing operational disruption',
            impact: 'Early week deliveries interfere with customer weekly planning. Consider Tuesday afternoon slot',
            metric_value: 15,
            target_value: 5
          }
        },
        {
          condition: Math.random() > 0.8,
          issue: {
            type: 'delivery_time' as const,
            severity: 'medium' as const,
            description: 'Delivery outside preferred time window',
            impact: 'Customer staff not available during actual delivery times, causing operational disruptions',
            metric_value: 15,
            target_value: 5
          }
        },
        {
          condition: Math.random() > 0.85,
          issue: {
            type: 'capacity' as const,
            severity: 'low' as const,
            description: 'Vehicle capacity mismatch',
            impact: 'Using oversized vehicles for small deliveries increases operational costs',
            metric_value: 30,
            target_value: 80
          }
        },
        {
          condition: Math.random() > 0.9,
          issue: {
            type: 'frequency' as const,
            severity: 'medium' as const,
            description: 'Emergency delivery requests increasing',
            impact: 'Customer placing more urgent orders suggests regular delivery schedule is insufficient',
            metric_value: 3,
            target_value: 0
          }
        }
      ]

      randomIssues.forEach(({ condition, issue }) => {
        if (condition && issues.length < 4) { // Limit to 4 issues per customer
          issues.push(issue)
        }
      })

      // Ensure at least one issue per non-compliant customer
      if (issues.length === 0) {
        issues.push({
          type: 'delivery_success',
          severity: 'medium',
          description: 'General compliance monitoring required',
          impact: 'Customer flagged for enhanced monitoring due to service level concerns',
          metric_value: 85,
          target_value: 95
        })
      }

      return {
        customer,
        current_metrics: {
          delivery_success_rate: successRate,
          avg_delivery_frequency_days: avgFrequency,
          avg_delivery_delay_hours: avgDelayHours,
          last_delivery_date: deliveryHistory[0]?.date || '2024-01-01'
        },
        target_metrics: {
          delivery_success_rate: 95,
          target_frequency_days: targetFrequency,
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
        description: 'Consolidate routes to reduce delivery time windows and improve success rates',
        implementation_cost: 1500,
        affected_routes: ['route-1', 'route-2', 'route-3'],
        expected_benefit: {
          delivery_success_improvement: 12.5,
          frequency_alignment: 8.0,
          time_reduction_hours: 2.5,
          efficiency_hl_km: 2.8
        },
        validation_status: 'validated'
      },
      {
        id: 'client-route-reassignment-1',
        client_id: 'customer-2',
        type: 'route_change',
        description: 'Move Bar El Encuentro from Tuesday route (Route-T2) to Wednesday route (Route-W1) - Client consistently closed on Tuesdays causing delivery failures',
        implementation_cost: 300,
        affected_routes: ['route-tuesday-2', 'route-wednesday-1'],
        expected_benefit: {
          delivery_success_improvement: 25.0,
          frequency_alignment: 15.0,
          time_reduction_hours: 0.5,
          efficiency_hl_km: 3.4
        },
        validation_status: 'validated'
      },
      {
        id: 'client-route-reassignment-2',
        client_id: 'customer-7',
        type: 'route_change',
        description: 'Relocate Restaurante La Plaza from Tuesday route (Route-T1) to Wednesday route (Route-W2) - Analysis shows 80% failure rate on Tuesdays due to staff unavailability',
        implementation_cost: 250,
        affected_routes: ['route-tuesday-1', 'route-wednesday-2'],
        expected_benefit: {
          delivery_success_improvement: 30.0,
          frequency_alignment: 12.0,
          time_reduction_hours: 0.3,
          efficiency_hl_km: 3.8
        },
        validation_status: 'validated'
      },
      {
        id: 'schedule-adjustment-1',
        client_id: 'customer-3',
        type: 'schedule_adjustment',
        description: 'Adjust delivery schedules to match customer availability patterns and reduce delays',
        implementation_cost: 500,
        affected_routes: ['route-1', 'route-4'],
        expected_benefit: {
          delivery_success_improvement: 8.0,
          frequency_alignment: 12.0,
          time_reduction_hours: 1.0,
          efficiency_hl_km: 2.6
        },
        validation_status: 'validated'
      },
      {
        id: 'client-route-reassignment-3',
        client_id: 'customer-8',
        type: 'route_change',
        description: 'Transfer Café Central from Tuesday morning route (Route-T3) to Wednesday afternoon route (Route-W3) - Customer reports Tuesday closure for weekly inventory management',
        implementation_cost: 400,
        affected_routes: ['route-tuesday-3', 'route-wednesday-3'],
        expected_benefit: {
          delivery_success_improvement: 35.0,
          frequency_alignment: 18.0,
          time_reduction_hours: 0.8,
          efficiency_hl_km: 4.1
        },
        validation_status: 'needs_review'
      },
      {
        id: 'vehicle-reassignment-1',
        client_id: 'customer-4',
        type: 'vehicle_reassignment',
        description: 'Assign appropriate vehicle sizes to match delivery volumes and reduce operational costs',
        implementation_cost: 2000,
        affected_routes: ['route-2', 'route-3', 'route-5'],
        expected_benefit: {
          delivery_success_improvement: 15.0,
          frequency_alignment: 6.0,
          time_reduction_hours: 4.0,
          efficiency_hl_km: 3.0
        },
        validation_status: 'needs_review'
      },
      {
        id: 'frequency-increase-1',
        client_id: 'customer-5',
        type: 'frequency_increase',
        description: 'Increase delivery frequency for high-demand customers to reduce emergency orders',
        implementation_cost: 800,
        affected_routes: ['route-1', 'route-6'],
        expected_benefit: {
          delivery_success_improvement: 10.0,
          frequency_alignment: 18.0,
          time_reduction_hours: 1.5,
          efficiency_hl_km: 2.9
        },
        validation_status: 'validated'
      },
      {
        id: 'multi-client-route-optimization-1',
        client_id: 'multiple',
        type: 'route_change',
        description: 'Bulk reassignment: Move 5 clients from Tuesday routes to Wednesday/Thursday routes based on delivery failure analysis - Tuesday shows 40% higher failure rate due to client closures',
        implementation_cost: 1200,
        affected_routes: ['route-tuesday-1', 'route-tuesday-2', 'route-wednesday-1', 'route-wednesday-2', 'route-thursday-1'],
        expected_benefit: {
          delivery_success_improvement: 28.0,
          frequency_alignment: 22.0,
          time_reduction_hours: 3.2,
          efficiency_hl_km: 3.7
        },
        validation_status: 'needs_review'
      },
      {
        id: 'time-window-optimization-1',
        client_id: 'customer-6',
        type: 'schedule_adjustment',
        description: 'Optimize delivery time windows based on customer operational hours and staff availability',
        implementation_cost: 300,
        affected_routes: ['route-2', 'route-4'],
        expected_benefit: {
          delivery_success_improvement: 7.0,
          frequency_alignment: 5.0,
          time_reduction_hours: 0.8,
          efficiency_hl_km: 2.4
        },
        validation_status: 'validated'
      }
    ]
  },
}
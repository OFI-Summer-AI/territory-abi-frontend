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

const FREQUENCY_DAYS: Record<Customer["frequency"], number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

function toHourNumber(value?: string): number {
  if (!value) return 12
  const [hh, mm] = value.split(":").map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 12
  return hh + mm / 60
}

function getAverageFrequencyDays(deliveries: Customer["delivery_history"]): number {
  const history = [...(deliveries ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  if (history.length < 2) return 0

  let totalDiffDays = 0
  for (let i = 1; i < history.length; i++) {
    const prev = new Date(history[i - 1].date)
    const cur = new Date(history[i].date)
    const diffDays = Math.max(0, (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    totalDiffDays += diffDays
  }

  return totalDiffDays / (history.length - 1)
}

function buildOptimizedRoutes(centerId: string, date: string): { currentRoutes: Route[]; proposedRoutes: Route[] } {
  const currentRoutes = routes.filter((r) => r.center_id === centerId && r.date === date)

  if (currentRoutes.length > 0) {
    const proposedRoutes = currentRoutes.map((route, index) => {
      const optimizedStops = [...route.stops].sort((a, b) => {
        const customerA = customers.find((c) => c.id === a.customer_id)
        const customerB = customers.find((c) => c.id === b.customer_id)
        const priorityWeight = (priority?: Customer["priority"]) =>
          priority === "high" ? 3 : priority === "medium" ? 2 : 1

        const priorityDiff = priorityWeight(customerB?.priority) - priorityWeight(customerA?.priority)
        if (priorityDiff !== 0) return priorityDiff
        return (b.order_kg ?? 0) - (a.order_kg ?? 0)
      })

      const resequencedStops = optimizedStops.map((stop, stopIndex) => ({
        ...stop,
        sequence: stopIndex + 1,
      }))

      const distanceReductionFactor = 0.9 - Math.min(0.05, Math.max(0, route.stops.length - 8) * 0.003)
      const timeReductionFactor = 0.88 - Math.min(0.04, Math.max(0, route.stops.length - 8) * 0.002)
      const optimizedKm = Math.max(5, route.estimated_km * distanceReductionFactor)
      const optimizedTimeMin = Math.max(120, route.estimated_time_min * timeReductionFactor)
      const optimizedCapacity = Math.min(98, Math.max(85, route.capacity_util_pct + 8 + (index % 3)))
      const optimizedCapacityHl = Math.min(98, Math.max(80, route.capacity_util_pct_hl + 8 + (index % 3)))

      return {
        ...route,
        id: `opt-${route.id}`,
        status: "planned" as const,
        stops: resequencedStops,
        estimated_km: Math.round(optimizedKm * 10) / 10,
        estimated_time_min: Math.round(optimizedTimeMin),
        capacity_util_pct: Math.round(optimizedCapacity),
        capacity_util_pct_hl: Math.round(optimizedCapacityHl),
      }
    })

    return { currentRoutes, proposedRoutes }
  }

  const centerCustomers = customers.filter((c) => c.center_id === centerId)
  const chunkSize = 8
  const proposedRoutes: Route[] = []

  for (let i = 0; i < centerCustomers.length; i += chunkSize) {
    const chunk = centerCustomers.slice(i, i + chunkSize)
    const stops = chunk.map((customer, index) => ({
      customer_id: customer.id,
      sequence: index + 1,
      estimated_arrival: `${8 + Math.floor(index * 0.75)}:${index % 2 === 0 ? "00" : "30"}`,
      estimated_duration_min: 12 + Math.round(customer.avg_order_kg / 70),
      order_kg: customer.avg_order_kg,
      order_hl: customer.avg_order_hl,
    }))

    const totalKg = chunk.reduce((sum, c) => sum + c.avg_order_kg, 0)
    const estimatedKm = 20 + chunk.length * 3.2
    const estimatedTimeMin = 180 + chunk.length * 18

    proposedRoutes.push({
      id: `opt-sim-route-${String(proposedRoutes.length + 1).padStart(2, "0")}`,
      center_id: centerId,
      vehicle_id: `vehicle-opt-${proposedRoutes.length + 1}`,
      date,
      status: "planned",
      stops,
      estimated_km: Math.round(estimatedKm * 10) / 10,
      estimated_time_min: Math.round(estimatedTimeMin),
      capacity_util_pct: Math.min(98, Math.max(82, Math.round(65 + totalKg / 120))),
      capacity_util_pct_hl: Math.min(95, Math.max(78, Math.round(60 + totalKg / 140))),
    })
  }

  const syntheticCurrentRoutes = proposedRoutes.map((route) => ({
    ...route,
    id: route.id.replace("opt-", "cur-"),
    estimated_km: Math.round(route.estimated_km * 1.14 * 10) / 10,
    estimated_time_min: Math.round(route.estimated_time_min * 1.12),
    capacity_util_pct: Math.max(55, route.capacity_util_pct - 12),
    capacity_util_pct_hl: Math.max(50, route.capacity_util_pct_hl - 10),
  }))

  return { currentRoutes: syntheticCurrentRoutes, proposedRoutes }
}

function calculateKpisForRoutes(dayRoutes: Route[]): KpiSummary {
  const totalKm = dayRoutes.reduce((sum, r) => sum + r.estimated_km, 0)
  const totalTime = dayRoutes.reduce((sum, r) => sum + r.estimated_time_min, 0)
  const totalCustomers = new Set(dayRoutes.flatMap((r) => r.stops.map((s) => s.customer_id))).size

  const avgCapacity =
    dayRoutes.length > 0 ? dayRoutes.reduce((sum, r) => sum + r.capacity_util_pct, 0) / dayRoutes.length : 0
  const avgCapacityHL =
    dayRoutes.length > 0
      ? dayRoutes.reduce((sum, r) => sum + (typeof r.capacity_util_pct_hl === "number" ? r.capacity_util_pct_hl : 0), 0) /
        dayRoutes.length
      : 0

  return {
    total_routes: dayRoutes.length,
    total_customers: totalCustomers,
    avg_capacity_util: Math.round(avgCapacity),
    total_km: Math.round(totalKm * 10) / 10,
    total_time_hours: Math.round((totalTime / 60) * 10) / 10,
    avg_capacity_util_hl: Math.round(avgCapacityHL),
  }
}

function computeEfficiencyHlKm(routeList: Route[], centerCustomers: Customer[]): number {
  const totalKm = routeList.reduce((sum, route) => sum + route.estimated_km, 0)
  if (totalKm <= 0) return 0

  const deliveredHl = centerCustomers.reduce((sum, customer) => {
    const delivered = customer.delivery_history?.reduce((acc, delivery) => acc + (delivery.delivered_hl || 0), 0) ?? 0
    return sum + delivered
  }, 0)

  return deliveredHl > 0 ? deliveredHl / totalKm : 0
}

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
    const exactRoute = routes.find((r) => r.id === id)

    let route: Route | undefined = exactRoute

    if (!route && id.startsWith("opt-")) {
      const directBaseId = id.replace(/^opt-/, "")
      const directBaseRoute = routes.find((r) => r.id === directBaseId)

      const paddedMatch = id.match(/^opt-route-(\d{2})$/)
      const paddedBaseRoute = paddedMatch
        ? routes.find((r) => r.id === `route-${Number(paddedMatch[1])}`)
        : undefined

      const indexBaseRoute = paddedMatch
        ? routes.filter((r) => r.date === "2025-01-10").sort((a, b) => a.id.localeCompare(b.id))[Number(paddedMatch[1]) - 1]
        : undefined

      const baseRoute = directBaseRoute ?? paddedBaseRoute ?? indexBaseRoute

      if (baseRoute) {
        route = {
          ...baseRoute,
          id,
          status: "planned",
          estimated_km: Math.round(baseRoute.estimated_km * 0.9 * 10) / 10,
          estimated_time_min: Math.round(baseRoute.estimated_time_min * 0.88),
          capacity_util_pct: Math.min(98, Math.max(85, baseRoute.capacity_util_pct + 8)),
          capacity_util_pct_hl: Math.min(98, Math.max(80, baseRoute.capacity_util_pct_hl + 8)),
          stops: [...baseRoute.stops]
            .sort((a, b) => (b.order_kg ?? 0) - (a.order_kg ?? 0))
            .map((stop, index) => ({
              ...stop,
              sequence: index + 1,
            })),
        }
      }
    }

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
    const center = centers.find((c) => c.id === center_id)
    if (!center) {
      throw new Error("Center not found")
    }

    const { currentRoutes, proposedRoutes } = buildOptimizedRoutes(center_id, date)
    const currentKpis = calculateKpisForRoutes(currentRoutes)
    const proposedKpis = calculateKpisForRoutes(proposedRoutes)

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

  async simulateCompliance(centerId: string, date = "2025-01-10"): Promise<ComplianceSimulationResult> {
    await new Promise((resolve) => setTimeout(resolve, 1200))

    const center = centers.find((c) => c.id === centerId)
    if (!center) {
      throw new Error("Center not found")
    }

    const centerCustomers = customers.filter((c) => c.center_id === centerId)
    const { currentRoutes, proposedRoutes } = buildOptimizedRoutes(centerId, date)

    const nonCompliantClients: NonCompliantClient[] = centerCustomers
      .map((customer) => {
        const deliveryHistory = customer.delivery_history || []
        const totalDeliveries = deliveryHistory.length
        const successfulDeliveries = deliveryHistory.filter((d) => d.status === "delivered" && d.delivered_hl > 0).length
        const failedDeliveries = Math.max(0, totalDeliveries - successfulDeliveries)
        const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0

        const avgFrequencyDays = getAverageFrequencyDays(deliveryHistory)
        const targetFrequencyDays = FREQUENCY_DAYS[customer.frequency]
        const avgDeliveryHour =
          deliveryHistory.length > 0
            ? deliveryHistory.reduce((sum, d) => sum + toHourNumber(d.delivery_time), 0) / deliveryHistory.length
            : 12
        const avgDeliveryDelayHours = Math.max(0, avgDeliveryHour - 9.5)

        const issues: ComplianceIssue[] = []

        if (successRate < 90) {
          issues.push({
            type: "delivery_success",
            severity: successRate < 75 ? "high" : "medium",
            description: `Bajo cumplimiento de entrega: ${successRate.toFixed(1)}% de entregas exitosas.`,
            impact: "Afecta continuidad operativa del cliente y eleva costos por reintentos.",
            metric_value: Number(successRate.toFixed(1)),
            target_value: 95,
          })
        }

        if (avgFrequencyDays > 0 && avgFrequencyDays > targetFrequencyDays * 1.25) {
          issues.push({
            type: "frequency",
            severity: avgFrequencyDays > targetFrequencyDays * 1.6 ? "high" : "medium",
            description: `Frecuencia insuficiente: promedio ${avgFrequencyDays.toFixed(1)} dias vs objetivo ${targetFrequencyDays} dias.`,
            impact: "Incrementa riesgo de quiebre de inventario y pedidos urgentes.",
            metric_value: Number(avgFrequencyDays.toFixed(1)),
            target_value: targetFrequencyDays,
          })
        }

        if (avgDeliveryDelayHours > 2) {
          issues.push({
            type: "delivery_time",
            severity: avgDeliveryDelayHours > 4 ? "high" : "medium",
            description: `Retrasos en ventana de entrega: ${avgDeliveryDelayHours.toFixed(1)} horas promedio.`,
            impact: "Reduce puntualidad de servicio y productividad del punto de entrega.",
            metric_value: Number(avgDeliveryDelayHours.toFixed(1)),
            target_value: 2,
          })
        }

        if (customer.priority === "high" && failedDeliveries >= 2) {
          issues.push({
            type: "capacity",
            severity: "medium",
            description: `Cliente prioritario con ${failedDeliveries} entregas no completadas.`,
            impact: "Requiere ajuste de capacidad/ruta para evitar incumplimientos recurrentes.",
            metric_value: failedDeliveries,
            target_value: 0,
          })
        }

        const sortedHistory = [...deliveryHistory].sort((a, b) => b.date.localeCompare(a.date))

        return {
          customer,
          issues,
          current_metrics: {
            delivery_success_rate: Number(successRate.toFixed(1)),
            avg_delivery_frequency_days: Number(avgFrequencyDays.toFixed(1)),
            avg_delivery_delay_hours: Number(avgDeliveryDelayHours.toFixed(1)),
            last_delivery_date: sortedHistory[0]?.date || date,
          },
          target_metrics: {
            delivery_success_rate: 95,
            target_frequency_days: targetFrequencyDays,
            max_delivery_delay_hours: 2,
          },
        }
      })
      .filter((item) => item.issues.length > 0)

    const optimizationSuggestions: OptimizationSuggestion[] = nonCompliantClients.flatMap((client, idx) => {
      const routeForCustomer = currentRoutes.find((route) => route.stops.some((stop) => stop.customer_id === client.customer.id))

      return client.issues.map((issue, issueIdx) => {
        const type: OptimizationSuggestion["type"] =
          issue.type === "frequency"
            ? "frequency_increase"
            : issue.type === "delivery_time"
              ? "schedule_adjustment"
              : issue.type === "capacity"
                ? "vehicle_reassignment"
                : "route_change"

        const severityMultiplier = issue.severity === "high" ? 1.2 : issue.severity === "critical" ? 1.35 : 1
        const baseBenefit = Math.max(4, Math.min(25, (issue.target_value - issue.metric_value) * 0.7))

        return {
          id: `opt-${client.customer.id}-${idx + 1}-${issueIdx + 1}`,
          client_id: client.customer.id,
          type,
          description: `Accion recomendada para ${client.customer.name}: ${issue.description}`,
          implementation_cost: Math.round((400 + issueIdx * 120 + idx * 35) * severityMultiplier),
          affected_routes: routeForCustomer ? [routeForCustomer.id] : [],
          expected_benefit: {
            delivery_success_improvement: Number((baseBenefit * 0.9).toFixed(1)),
            frequency_alignment: Number((issue.type === "frequency" ? baseBenefit : baseBenefit * 0.45).toFixed(1)),
            time_reduction_hours: Number((issue.type === "delivery_time" ? 1.2 : 0.6).toFixed(1)),
            efficiency_hl_km: Number((0.2 + baseBenefit * 0.05).toFixed(2)),
          },
          validation_status: issue.severity === "high" || issue.severity === "critical" ? "needs_review" : "validated",
        }
      })
    })

    const allSuccessRates = centerCustomers.map((customer) => {
      const history = customer.delivery_history || []
      const success = history.filter((d) => d.status === "delivered" && d.delivered_hl > 0).length
      return history.length > 0 ? (success / history.length) * 100 : 0
    })

    const allFrequencyAdherence = centerCustomers.map((customer) => {
      const avgDays = getAverageFrequencyDays(customer.delivery_history)
      const target = FREQUENCY_DAYS[customer.frequency]
      if (avgDays <= 0) return 0
      return Math.min(100, (target / Math.max(target, avgDays)) * 100)
    })

    const allTimePerformance = centerCustomers.map((customer) => {
      const history = customer.delivery_history || []
      if (history.length === 0) return 0
      const avgHour = history.reduce((sum, d) => sum + toHourNumber(d.delivery_time), 0) / history.length
      const delay = Math.max(0, avgHour - 9.5)
      return Math.max(0, 100 - delay * 12)
    })

    const avg = (values: number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)
    const beforeComplianceRate = centerCustomers.length > 0 ? ((centerCustomers.length - nonCompliantClients.length) / centerCustomers.length) * 100 : 0
    const beforeSuccessRate = avg(allSuccessRates)
    const beforeFrequencyAdherence = avg(allFrequencyAdherence)
    const beforeTimePerformance = avg(allTimePerformance)
    const beforeEfficiency = computeEfficiencyHlKm(currentRoutes, centerCustomers)

    const deliverySuccessGain = Math.min(18, 3 + optimizationSuggestions.length * 0.9)
    const frequencyGain = Math.min(24, 4 + optimizationSuggestions.length * 1.1)
    const onTimeGain = Math.min(14, 2 + optimizationSuggestions.length * 0.7)
    const efficiencyGain = Math.min(1.8, 0.25 + optimizationSuggestions.length * 0.08)

    const afterSuccessRate = Math.min(98, beforeSuccessRate + deliverySuccessGain)
    const afterFrequencyAdherence = Math.min(98, beforeFrequencyAdherence + frequencyGain)
    const afterTimePerformance = Math.min(98, beforeTimePerformance + onTimeGain)
    const afterEfficiency = beforeEfficiency + efficiencyGain

    const improvedNonCompliant = Math.round(nonCompliantClients.length * 0.72)
    const afterCompliantClients = Math.min(centerCustomers.length, centerCustomers.length - nonCompliantClients.length + improvedNonCompliant)
    const afterComplianceRate = centerCustomers.length > 0 ? (afterCompliantClients / centerCustomers.length) * 100 : 0

    const warnings: string[] = []
    if (optimizationSuggestions.filter((s) => s.validation_status === "needs_review").length > 0) {
      warnings.push("Algunas sugerencias requieren revision operativa antes de su despliegue.")
    }
    if (nonCompliantClients.length === 0) {
      warnings.push("No se detectaron clientes no cubiertos en la muestra actual.")
    }

    return {
      non_compliant_clients: nonCompliantClients,
      optimization_suggestions: optimizationSuggestions,
      impact_analysis: {
        before: {
          total_clients: centerCustomers.length,
          compliant_clients: centerCustomers.length - nonCompliantClients.length,
          compliance_rate: Number(beforeComplianceRate.toFixed(1)),
          avg_delivery_success_rate: Number(beforeSuccessRate.toFixed(1)),
          avg_frequency_adherence: Number(beforeFrequencyAdherence.toFixed(1)),
          avg_delivery_time_performance: Number(beforeTimePerformance.toFixed(1)),
          avg_hl_km_efficiency: Number(beforeEfficiency.toFixed(2)),
        },
        after: {
          total_clients: centerCustomers.length,
          compliant_clients: afterCompliantClients,
          compliance_rate: Number(afterComplianceRate.toFixed(1)),
          avg_delivery_success_rate: Number(afterSuccessRate.toFixed(1)),
          avg_frequency_adherence: Number(afterFrequencyAdherence.toFixed(1)),
          avg_delivery_time_performance: Number(afterTimePerformance.toFixed(1)),
          avg_hl_km_efficiency: Number(afterEfficiency.toFixed(2)),
        },
        improvements: {
          delivery_success_rate_change: Number((afterSuccessRate - beforeSuccessRate).toFixed(1)),
          efficiency_improvement_hl_km: Number((afterEfficiency - beforeEfficiency).toFixed(2)),
          frequency_compliance_improvement: Number((afterFrequencyAdherence - beforeFrequencyAdherence).toFixed(1)),
          on_time_delivery_improvement: Number((afterTimePerformance - beforeTimePerformance).toFixed(1)),
        },
      },
      proposed_routes: proposedRoutes,
      affected_compliant_clients: [],
      validation_results: {
        no_negative_impact: warnings.length === 0,
        warnings,
        recommendations: [
          "Implementar primero ajustes de ruta para clientes de prioridad alta.",
          "Revisar ventanas de entrega para clientes con baja puntualidad historica.",
          "Monitorear semanalmente el cumplimiento de frecuencia por segmento.",
        ],
      },
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
        description: 'Relocate Supermercado La Canasta from Tuesday route (Route-T2) to Wednesday route (Route-W1) - Client experiences recurring payment processing constraints on Tuesdays, resulting in delivery deferrals and reduced service efficiency',
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
// Core TypeScript types for the territory planning application

export interface Center {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    capacity_kg: number
    capacity_hl: number
    active: boolean
    employees?: number
    vehicles?: CenterVehicle[]
  }
  
  export interface CenterVehicle {
    id: string
    plate: string
    capacity_kg: number
    type: "van" | "truck" | "motorcycle"
  }
  
  export interface DeliveryHistory {
    id: string
    date: string
    ordered_hl: number
    delivered_hl: number
    status: "delivered" | "not_delivered"
    vehicle_id: string
    delivery_time: string
    reason?: string
  }
  
  export interface Vehicle {
    id: string
    plate: string
    capacity_kg: number
    capacity_hl: number
    capacity_m3: number
    type: "van" | "truck" | "motorcycle"
    center_id: string
  }
  
  export interface Customer {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    center_id: string
    avg_order_kg: number
    avg_order_hl: number
    frequency: "daily" | "weekly" | "biweekly" | "monthly"
    priority: "high" | "medium" | "low"
    active: boolean
    delivery_history?: DeliveryHistory[]
  }
  
  export interface ComplianceIssue {
    type: "frequency" | "delivery_success" | "delivery_time" | "capacity"
    severity: "critical" | "high" | "medium" | "low"
    description: string
    impact: string
    metric_value: number
    target_value: number
  }
  
  export interface NonCompliantClient {
    customer: Customer
    issues: ComplianceIssue[]
    current_metrics: {
      delivery_success_rate: number
      avg_delivery_frequency_days: number
      avg_delivery_delay_hours: number
      last_delivery_date: string
    }
    target_metrics: {
      delivery_success_rate: number
      target_frequency_days: number
      max_delivery_delay_hours: number
    }
  }
  
  export interface OptimizationSuggestion {
    id: string
    client_id: string
    type: "route_change" | "schedule_adjustment" | "vehicle_reassignment" | "frequency_increase"
    description: string
    implementation_cost: number
    expected_benefit: {
      delivery_success_improvement: number
      frequency_alignment: number
      time_reduction_hours: number
      efficiency_hl_km: number
    }
    affected_routes: string[]
    validation_status: "validated" | "needs_review" | "conflicts"
  }
  
  export interface ComplianceSimulationResult {
    non_compliant_clients: NonCompliantClient[]
    optimization_suggestions: OptimizationSuggestion[]
    impact_analysis: {
      before: ComplianceMetrics
      after: ComplianceMetrics
      improvements: {
        delivery_success_rate_change: number
        efficiency_improvement_hl_km: number
        frequency_compliance_improvement: number
        on_time_delivery_improvement: number
      }
    }
    proposed_routes: Route[]
    affected_compliant_clients: Customer[]
    validation_results: {
      no_negative_impact: boolean
      warnings: string[]
      recommendations: string[]
    }
  }
  
  export interface ComplianceMetrics {
    total_clients: number
    compliant_clients: number
    compliance_rate: number
    avg_delivery_success_rate: number
    avg_frequency_adherence: number
    avg_delivery_time_performance: number
    avg_hl_km_efficiency: number
  }
  
  export interface RouteStop {
    customer_id: string
    customer_name?: string
    address?: string
    sequence: number
    estimated_arrival: string
    estimated_duration_min: number
    order_kg: number
    order_hl: number
  }
  
  export interface Route {
    id: string
    center_id: string
    vehicle_id: string
    date: string
    status: "planned" | "in_progress" | "completed" | "cancelled"
    stops: RouteStop[]
    estimated_km: number
    estimated_time_min: number
    capacity_util_pct: number
    capacity_util_pct_hl: number
    actual_km?: number
    actual_time_min?: number
  }
  
  export interface KpiSummary {
    total_routes: number
    total_customers: number
    avg_capacity_util: number
    avg_capacity_util_hl: number
    total_km: number
    total_time_hours: number
    cost_per_delivery?: number
  }
  
  export interface SimulationRequest {
    center_id: string
    date: string
    include_compliance_analysis?: boolean
    optimization_level?: "basic" | "advanced" | "comprehensive"
  }
  
  export interface SimulationResult {
    proposed_routes: Route[]
    current_kpis: KpiSummary
    proposed_kpis: KpiSummary
    savings: {
      km_saved: number
      time_saved_hours: number
      cost_saved?: number
    }
    compliance_analysis?: ComplianceSimulationResult
  }
  
  export interface ReportComparison {
    date: string
    proposed: KpiSummary
    executed: KpiSummary
  }
  
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
  }
  
  export interface RouteStop {
    customer_id: string
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
    customer_ids: string[]
    center_id: string
    date: string
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
  }
  
  export interface ReportComparison {
    date: string
    proposed: KpiSummary
    executed: KpiSummary
  }
  
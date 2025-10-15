import type { Center, Customer, Route, KpiSummary, SimulationRequest, SimulationResult } from "./types"
import { dataService } from "./data-service"

export async function getCenters(): Promise<Center[]> {
  return dataService.getCenters()
}

export async function getCustomers(params?: {
  centerId?: string
  page?: number
  q?: string
}): Promise<{
  data: Customer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  return dataService.getCustomers(params)
}

export async function getRoutes(params?: { date?: string; centerId?: string }): Promise<Route[]> {
  return dataService.getRoutes(params)
}

export async function getRoute(id: string): Promise<Route & { center: Center }> {
  const route = dataService.getRoute(id)
  if (!route) throw new Error("Route not found")
  return route
}

export async function getCustomer(id: string): Promise<
  Customer & {
    history: Array<{ month: string; deliveries: number; avg_kg: number; avg_hl: number }>
    prediction: { next_month_deliveries: number; confidence: number; trend: string }
  }
> {
  const customer = dataService.getCustomer(id)
  if (!customer) throw new Error("Customer not found")
  return customer
}

export async function simulateRoutes(request: SimulationRequest): Promise<SimulationResult> {
  return dataService.simulateRoutes(request)
}

export async function getKpis(date?: string): Promise<KpiSummary> {
  return dataService.getKpis(date)
}

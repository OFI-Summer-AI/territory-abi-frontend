import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Link } from "react-router-dom"
import type { Customer } from "@/modules/lib/types"
import { Eye } from "lucide-react"

interface CustomerTableProps {
  customers: Customer[]
  onView?: (customerId: string) => void
}

export function CustomerTable({ customers, onView }: CustomerTableProps) {
  const COSTO_FIJO_ENVIO = 185000
  const COSTO_VARIABLE_POR_KG = 900
  type SortKey = "id" | "name" | "effective" | "completionRate" | "kg" | "ratio" | "priority" | "frequency"
  type SortDirection = "asc" | "desc"

  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const [idFilter, setIdFilter] = useState("")
  const [clienteFilter, setClienteFilter] = useState("")
  const [minEfectivasFilter, setMinEfectivasFilter] = useState("")
  const [minCoberturaFilter, setMinCoberturaFilter] = useState("")
  const [minKgFilter, setMinKgFilter] = useState("")
  const [maxRatioFilter, setMaxRatioFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<"all" | Customer["priority"]>("all")
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | Customer["frequency"]>("all")

  
  const getEffectiveDeliveries = (customer: Customer) => {
    const totalDeliveries = customer.delivery_history?.length ?? 0
    const effectiveDeliveries = customer.delivery_history?.filter((d) => d.status === "delivered").length ?? 0
    const ineffectiveDeliveries = totalDeliveries - effectiveDeliveries

    return { effective: effectiveDeliveries, ineffective: ineffectiveDeliveries }
  }

  const getDeliveryCompletionRate = (customer: Customer) => {
    const totalDeliveries = customer.delivery_history?.length ?? 0
    if (totalDeliveries === 0) return 0

    const completedDeliveries = customer.delivery_history?.filter((d) => d.status === "delivered").length ?? 0
    return Math.round((completedDeliveries / totalDeliveries) * 100)
  }

  const getTotalKilogramsDelivered = (customer: Customer) => {
    const conversionFactor = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0
    return customer.delivery_history?.reduce((total, delivery) => {
      return total + delivery.delivered_hl * conversionFactor
    }, 0) ?? 0
  }

  const getRatioLogistico = (customer: Customer) => {
    const factorKgPorHl = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0
    const totalEntregas = customer.delivery_history?.length ?? 0
    const totalKgPedido =
      customer.delivery_history?.reduce((sum, delivery) => sum + delivery.ordered_hl * factorKgPorHl, 0) ?? 0

    const costoLogistico = totalEntregas * (COSTO_FIJO_ENVIO * 0.4) + totalKgPedido * COSTO_VARIABLE_POR_KG
    const costoTotal = costoLogistico + totalEntregas * 136000 + totalKgPedido * 510
    const ratio = costoTotal > 0 ? (costoLogistico / costoTotal) * 100 : 0
    return Number(ratio.toFixed(1))
  }

  const getPriorityColor = (priority: Customer["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-800 border-red-800"
      case "medium":
        return "bg-yellow-50 text-yellow-800 border-yellow-800"
      case "low":
        return "bg-green-50 text-green-800 border-green-800"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getFrequencyColor = (frequency: Customer["frequency"]) => {
    switch (frequency) {
      case "daily":
        return "bg-blue-50 text-blue-800 border-blue-800"
      case "weekly":
        return "bg-purple-50 text-purple-800 border-purple-800"
      case "biweekly":
        return "bg-orange-50 text-orange-800 border-orange-800"
      case "monthly":
        return "bg-gray-50 text-gray-800 border-gray-800"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ""
    return sortDirection === "asc" ? " ▲" : " ▼"
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDirection("asc")
  }

  const tableRows = useMemo(() => {
    const normalizedIdFilter = idFilter.trim().toLowerCase()
    const normalizedClienteFilter = clienteFilter.trim().toLowerCase()
    const minEfectivas = minEfectivasFilter === "" ? null : Number(minEfectivasFilter)
    const minCobertura = minCoberturaFilter === "" ? null : Number(minCoberturaFilter)
    const minKg = minKgFilter === "" ? null : Number(minKgFilter)
    const maxRatio = maxRatioFilter === "" ? null : Number(maxRatioFilter)

    const rows = customers.map((customer) => {
      const deliveryStats = getEffectiveDeliveries(customer)
      const completionRate = getDeliveryCompletionRate(customer)
      const totalKg = getTotalKilogramsDelivered(customer)
      const ratioLogistico = getRatioLogistico(customer)

      return {
        customer,
        deliveryStats,
        completionRate,
        totalKg,
        ratioLogistico,
      }
    })

    const filtered = rows.filter(({ customer, deliveryStats, completionRate, totalKg, ratioLogistico }) => {
      if (normalizedIdFilter && !customer.id.toLowerCase().includes(normalizedIdFilter)) return false
      if (
        normalizedClienteFilter &&
        !`${customer.name} ${customer.address}`.toLowerCase().includes(normalizedClienteFilter)
      ) {
        return false
      }
      if (minEfectivas !== null && deliveryStats.effective < minEfectivas) return false
      if (minCobertura !== null && completionRate < minCobertura) return false
      if (minKg !== null && totalKg < minKg) return false
      if (maxRatio !== null && ratioLogistico > maxRatio) return false
      if (priorityFilter !== "all" && customer.priority !== priorityFilter) return false
      if (frequencyFilter !== "all" && customer.frequency !== frequencyFilter) return false
      return true
    })

    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case "id":
          comparison = a.customer.id.localeCompare(b.customer.id)
          break
        case "name":
          comparison = a.customer.name.localeCompare(b.customer.name)
          break
        case "effective":
          comparison = a.deliveryStats.effective - b.deliveryStats.effective
          break
        case "completionRate":
          comparison = a.completionRate - b.completionRate
          break
        case "kg":
          comparison = a.totalKg - b.totalKg
          break
        case "ratio":
          comparison = a.ratioLogistico - b.ratioLogistico
          break
        case "priority":
          comparison = a.customer.priority.localeCompare(b.customer.priority)
          break
        case "frequency":
          comparison = a.customer.frequency.localeCompare(b.customer.frequency)
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [
    customers,
    idFilter,
    clienteFilter,
    minEfectivasFilter,
    minCoberturaFilter,
    minKgFilter,
    maxRatioFilter,
    priorityFilter,
    frequencyFilter,
    sortKey,
    sortDirection,
  ])

  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-2 lg:grid-cols-4">
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Filtrar ID"
          value={idFilter}
          onChange={(e) => setIdFilter(e.target.value)}
        />
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Filtrar cliente o direccion"
          value={clienteFilter}
          onChange={(e) => setClienteFilter(e.target.value)}
        />
        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Min entregas efectivas"
          value={minEfectivasFilter}
          onChange={(e) => setMinEfectivasFilter(e.target.value)}
        />
        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Min % cobertura"
          value={minCoberturaFilter}
          onChange={(e) => setMinCoberturaFilter(e.target.value)}
        />
        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Min KG entregado"
          value={minKgFilter}
          onChange={(e) => setMinKgFilter(e.target.value)}
        />
        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Max ratio logistico (%)"
          value={maxRatioFilter}
          onChange={(e) => setMaxRatioFilter(e.target.value)}
        />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "all" | Customer["priority"])}
        >
          <option value="all">Prioridad: todas</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value as "all" | Customer["frequency"])}
        >
          <option value="all">Frecuencia: todas</option>
          <option value="daily">Diaria</option>
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quincenal</option>
          <option value="monthly">Mensual</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("id")}>ID{getSortIndicator("id")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("name")}>Cliente{getSortIndicator("name")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("effective")}>Entregas Efectivas{getSortIndicator("effective")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("completionRate")}>Entregas Cubiertas{getSortIndicator("completionRate")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("kg")}>KG Entregado{getSortIndicator("kg")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("ratio")}>Ratio Logistico/Total{getSortIndicator("ratio")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("priority")}>Prioridad{getSortIndicator("priority")}</button>
            </TableHead>
            <TableHead>
              <button className="font-medium" onClick={() => toggleSort("frequency")}>Frecuencia{getSortIndicator("frequency")}</button>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows.map(({ customer, deliveryStats, completionRate, totalKg, ratioLogistico }) => {
            return (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.id}</TableCell>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">{customer.address}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="text-green-600 font-medium">{deliveryStats.effective} efectivas</div>
                    <div className="text-red-600">{deliveryStats.ineffective} inefectivas</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${
                          completionRate >= 90 ? "bg-green-500" : completionRate >= 70 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{completionRate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{Math.round(totalKg).toLocaleString()} KG</div>
                  <div className="text-xs text-muted-foreground">Promedio: {customer.avg_order_kg} KG</div>
                </TableCell>
                <TableCell>
                  <span className={ratioLogistico <= 45 ? "text-chart-2 font-medium" : "text-destructive font-medium"}>
                    {ratioLogistico}%
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(customer.priority)}>
                    {customer.priority === "high" ? "Alta" : customer.priority === "medium" ? "Media" : "Baja"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getFrequencyColor(customer.frequency)}>
                    {customer.frequency === "daily"
                      ? "Diaria"
                      : customer.frequency === "weekly"
                        ? "Semanal"
                        : customer.frequency === "biweekly"
                          ? "Quincenal"
                          : "Mensual"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/customers/${customer.id}`}>
                      <Button variant="ghost" size="sm" onClick={() => onView?.(customer.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

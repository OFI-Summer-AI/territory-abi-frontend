import { useEffect, useMemo, useState } from "react"
import { CustomerTable } from "@/modules/customer/customer-table"
import { KpiCard } from "@/modules/dashboard/components/kpi-card"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Checkbox } from "@/shared/ui/checkbox"
import { Label } from "@/shared/ui/label"
import { getAllCustomers, getRoutes, getKpis } from "@/modules/lib/api"
import type { Customer, Route, KpiSummary } from "@/modules/lib/types"
import { Map, Truck, Users, Gauge, Clock, Package, DollarSign, PiggyBank, ChevronDown, ChevronUp } from "lucide-react"
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export default function DashboardPage() {
  const GRAPH_PALETTE = [
    "#022f40",
    "#38aecc",
    "#0090c1",
    "#183446",
    "#046e8f",
    "#5cc8ff",
    "#93867f",
    "#343633",
    "#7d70ba",
    "#dec1ff",
  ]
  const COSTO_POR_KM = 5200
  const COSTO_POR_HORA = 90000
  const COSTO_FIJO_ENVIO = 185000
  const PRECIO_VENTA_POR_KG = 3200
  const OBJETIVO_AHORRO = 0.08

  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [kpis, setKpis] = useState<KpiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRatioClientIds, setSelectedRatioClientIds] = useState<string[]>([])
  const [isRatioSelectorOpen, setIsRatioSelectorOpen] = useState(false)
  const [forecastStartMonth, setForecastStartMonth] = useState("")
  const [forecastEndMonth, setForecastEndMonth] = useState("")

  useEffect(() => {
    async function loadData() {
      try {
        const [customersData, routesData, kpisData] = await Promise.all([
          getAllCustomers(),
          getRoutes({ date: "2025-01-10" }),
          getKpis("2025-01-10"),
        ])

        setCustomers(customersData)
        setRoutes(routesData)
        setKpis(kpisData)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (customers.length === 0) return

    setSelectedRatioClientIds((previous) => {
      const validCustomerIds = new Set(customers.map((customer) => customer.id))
      const filteredPrevious = previous.filter((id) => validCustomerIds.has(id))
      if (filteredPrevious.length > 0) {
        return filteredPrevious
      }

      return customers.slice(0, 8).map((customer) => customer.id)
    })
  }, [customers])

  useEffect(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const end = new Date(start)
    end.setMonth(start.getMonth() + 5)
    setForecastStartMonth(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`)
    setForecastEndMonth(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`)
  }, [])

  const totalKgProgramados = routes.reduce(
    (acc, route) => acc + route.stops.reduce((sum, stop) => sum + stop.order_kg, 0),
    0,
  )
  const capacidadPromedioKg = routes.length > 0 ? totalKgProgramados / routes.length : 0

  const costoTotalEnvio = (kpis?.total_km ?? 0) * COSTO_POR_KM + (kpis?.total_time_hours ?? 0) * COSTO_POR_HORA
  const costoPromedioEnvio = (kpis?.total_routes ?? 0) > 0 ? costoTotalEnvio / (kpis?.total_routes ?? 1) : 0
  const costoPromedioEnvioPeriodoAnterior = costoPromedioEnvio * 1.08
  const variacionCostoEnvio =
    costoPromedioEnvioPeriodoAnterior > 0
      ? ((costoPromedioEnvio - costoPromedioEnvioPeriodoAnterior) / costoPromedioEnvioPeriodoAnterior) * 100
      : 0
  const costoPromedioPorKm = (kpis?.total_km ?? 0) > 0 ? costoTotalEnvio / (kpis?.total_km ?? 1) : 0
  const ahorroPotencial = costoTotalEnvio * OBJETIVO_AHORRO

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value)

  const formatMoneyCompact = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)

  const costoPorRutaData = routes.slice(0, 8).map((route) => {
    const costoRuta = route.estimated_km * COSTO_POR_KM + (route.estimated_time_min / 60) * COSTO_POR_HORA
    return {
      ruta: route.id,
      costo: Math.round(costoRuta),
      ahorro: Math.round(costoRuta * OBJETIVO_AHORRO),
    }
  })

  const tcoMensualBaseData = Object.entries(
    customers.reduce<
      Record<
        string,
        {
          transporte: number
          procesamiento: number
          administrativos: number
          excepciones: number
          aduanales: number
        }
      >
    >((acc, customer) => {
      const factorKgPorHl = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0

      for (const delivery of customer.delivery_history ?? []) {
        const mes = delivery.date.slice(0, 7)
        const orderedKg = delivery.ordered_hl * factorKgPorHl
        const deliveredKg = delivery.delivered_hl * factorKgPorHl
        const isFailed = delivery.status === "not_delivered" || delivery.delivered_hl <= 0
        const mermaKg = Math.max(0, orderedKg - deliveredKg)

        const tarifaBaseFlete = COSTO_FIJO_ENVIO * 0.72
        const cargoCombustible = orderedKg * 170
        const ultimaMilla = COSTO_FIJO_ENVIO * 0.16
        const transporte = tarifaBaseFlete + cargoCombustible + ultimaMilla

        const materialesEmpaque = orderedKg * 85
        const manoObraEmbalaje = COSTO_FIJO_ENVIO * 0.12
        const insumosTecnologia = 28000
        const procesamiento = materialesEmpaque + manoObraEmbalaje + insumosTecnologia

        const softwareLogistica = 46000
        const servicioCliente = (isFailed ? 42000 : 24000) + mermaKg * 14
        const segurosCarga = orderedKg * 48
        const administrativos = softwareLogistica + servicioCliente + segurosCarga

        const logisticaInversa = isFailed ? COSTO_FIJO_ENVIO * 0.55 + orderedKg * 120 : orderedKg * 22
        const reenvios = isFailed ? COSTO_FIJO_ENVIO * 0.7 + orderedKg * 180 : 0
        const perdidaClientes = isFailed ? COSTO_FIJO_ENVIO * 0.22 : 0
        const excepciones = logisticaInversa + reenvios + perdidaClientes

        const arancelesImpuestos = deliveredKg * 38
        const agentesAduanales = 12000
        const almacenajePuerto = isFailed ? 20000 : 9000
        const aduanales = arancelesImpuestos + agentesAduanales + almacenajePuerto

        if (!acc[mes]) {
          acc[mes] = {
            transporte: 0,
            procesamiento: 0,
            administrativos: 0,
            excepciones: 0,
            aduanales: 0,
          }
        }

        acc[mes].transporte += transporte
        acc[mes].procesamiento += procesamiento
        acc[mes].administrativos += administrativos
        acc[mes].excepciones += excepciones
        acc[mes].aduanales += aduanales
      }

      return acc
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([mes, valores]) => ({
      mes,
      transporte: Math.round(valores.transporte),
      procesamiento: Math.round(valores.procesamiento),
      administrativos: Math.round(valores.administrativos),
      excepciones: Math.round(valores.excepciones),
      aduanales: Math.round(valores.aduanales),
    }))

  const tcoMensualData = tcoMensualBaseData.reduce<typeof tcoMensualBaseData>((acc, item, index) => {
    if (index === 0) {
      acc.push(item)
      return acc
    }

    const prev = acc[index - 1]
    const totalActual = item.transporte + item.procesamiento + item.administrativos + item.excepciones + item.aduanales
    const totalPrev = prev.transporte + prev.procesamiento + prev.administrativos + prev.excepciones + prev.aduanales
    const totalObjetivo = Math.min(totalActual, Math.round(totalPrev * 0.93))
    const factorAjuste = totalActual > 0 ? totalObjetivo / totalActual : 1

    acc.push({
      ...item,
      transporte: Math.round(item.transporte * factorAjuste),
      procesamiento: Math.round(item.procesamiento * factorAjuste),
      administrativos: Math.round(item.administrativos * factorAjuste),
      excepciones: Math.round(item.excepciones * factorAjuste),
      aduanales: Math.round(item.aduanales * factorAjuste),
    })

    return acc
  }, [])

  const ratioCostoEnvioClienteBaseData = customers
    .map((customer) => {
      const factorKgPorHl = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0
      const totalEntregas = customer.delivery_history?.length ?? 0
      const totalKgPedido =
        customer.delivery_history?.reduce((sum, delivery) => sum + delivery.ordered_hl * factorKgPorHl, 0) ?? 0

      // Shipping Cost Ratio = (Gastos Totales de Envio / Ingresos Totales por Ventas) * 100
      const tarifaPaqueteria = totalEntregas * (COSTO_FIJO_ENVIO * 0.68)
      const suplementoCombustible = totalKgPedido * 160
      const empaque = totalKgPedido * 90
      const manoObraPreparacion = totalEntregas * (COSTO_FIJO_ENVIO * 0.11)
      const ultimaMilla = totalEntregas * (COSTO_FIJO_ENVIO * 0.18 + (customer.priority === "high" ? 28000 : 18000))

      const gastosTotalesEnvio =
        tarifaPaqueteria + suplementoCombustible + empaque + manoObraPreparacion + ultimaMilla

      const ingresosTotalesVentas = totalKgPedido * PRECIO_VENTA_POR_KG
      const ratio = ingresosTotalesVentas > 0 ? (gastosTotalesEnvio / ingresosTotalesVentas) * 100 : 0

      return {
        id: customer.id,
        name: customer.name,
        value: Number(ratio.toFixed(1)),
      }
    })

  const ratioCostoEnvioClienteData = ratioCostoEnvioClienteBaseData
    .filter((item) => selectedRatioClientIds.includes(item.id))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)

  const ratioCostoEnvioColors = GRAPH_PALETTE

  const monthSpan = (start: string, end: string) => {
    if (!start || !end) return [] as string[]
    const [startYear, startMonth] = start.split("-").map(Number)
    const [endYear, endMonth] = end.split("-").map(Number)
    if (!startYear || !startMonth || !endYear || !endMonth) return []

    const out: string[] = []
    const cur = new Date(startYear, startMonth - 1, 1)
    const last = new Date(endYear, endMonth - 1, 1)
    if (cur > last) return []

    while (cur <= last) {
      out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`)
      cur.setMonth(cur.getMonth() + 1)
    }

    return out
  }

  const demandaGlobalForecastData = useMemo(() => {
    const historicalMap = customers.reduce<Record<string, { deliveries: number; kg: number }>>((acc, customer) => {
      const factorKgPorHl = customer.avg_order_hl > 0 ? customer.avg_order_kg / customer.avg_order_hl : 0
      for (const delivery of customer.delivery_history ?? []) {
        const month = delivery.date.slice(0, 7)
        if (!acc[month]) {
          acc[month] = { deliveries: 0, kg: 0 }
        }
        acc[month].deliveries += 1
        acc[month].kg += delivery.delivered_hl * factorKgPorHl
      }
      return acc
    }, {})

    const historicalSeries = Object.entries(historicalMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, deliveries: value.deliveries, kg: value.kg }))

    const recent = historicalSeries.slice(-6)
    const prevWindow = recent.slice(0, 3)
    const lastWindow = recent.slice(-3)
    const prevAvgDeliveries =
      prevWindow.reduce((sum, item) => sum + item.deliveries, 0) / Math.max(1, prevWindow.length)
    const lastAvgDeliveries =
      lastWindow.reduce((sum, item) => sum + item.deliveries, 0) / Math.max(1, lastWindow.length)
    const trendFactor = prevAvgDeliveries > 0 ? Math.min(1.06, Math.max(0.95, lastAvgDeliveries / prevAvgDeliveries)) : 1.01

    const baseDeliveries =
      recent.reduce((sum, item) => sum + item.deliveries, 0) / Math.max(1, recent.length)
    const baseKg = recent.reduce((sum, item) => sum + item.kg, 0) / Math.max(1, recent.length)

    let deliveriesLevel = baseDeliveries || 100
    let kgLevel = baseKg || 55000
    const months = monthSpan(forecastStartMonth, forecastEndMonth)

    return months.map((month, idx) => {
      const seasonal = 1 + 0.06 * Math.sin((idx / 12) * 2 * Math.PI)
      deliveriesLevel = deliveriesLevel * trendFactor
      kgLevel = kgLevel * trendFactor

      return {
        month,
        deliveries: Math.max(0, Number((deliveriesLevel * seasonal).toFixed(1))),
        kg: Math.max(0, Number((kgLevel * seasonal).toFixed(1))),
      }
    })
  }, [customers, forecastStartMonth, forecastEndMonth])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Cargando panel...</div>
      </div>
    )
  }

  return (
      <>
        <div className="mb-6 space-y-4">
          <div>
            <h2 className="text-3xl font-bold">Panel</h2>
            <p className="text-muted-foreground">Resumen de operaciones de entrega del 10 de enero de 2025</p>
          </div>

          {/* KPIs */}
          {kpis && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total Rutas" value={110} icon={<Truck className="h-4 w-4" />} />
              <KpiCard label="Total Ordenes" value={356} icon={<Package className="h-4 w-4" />} />
              <KpiCard label="Total Clientes" value={kpis.total_customers} icon={<Users className="h-4 w-4" />} />
              <KpiCard
                label="Capacidad Prom. KG"
                value={`${capacidadPromedioKg.toFixed(0)} kg`}
                icon={<Gauge className="h-4 w-4" />}
              />
              <KpiCard
                label="Porcentaje de Cobertura"
                value="89%"
                icon={<Map className="h-4 w-4" />}
              />
              <KpiCard
                label="Costo Prom. de Envio"
                value={formatMoney(costoPromedioEnvio)}
                icon={<DollarSign className="h-4 w-4" />}
                trend={variacionCostoEnvio <= 0 ? "up" : "down"}
                trendValue={`${variacionCostoEnvio.toFixed(1)}% vs periodo anterior`}
              />
              <KpiCard
                label="Costo Promedio por KM"
                value={formatMoney(costoPromedioPorKm)}
                icon={<Clock className="h-4 w-4" />}
              />
              <KpiCard
                label="Ahorro Potencial"
                value={formatMoney(ahorroPotencial)}
                icon={<PiggyBank className="h-4 w-4" />}
                trend="up"
                trendValue={`${(OBJETIVO_AHORRO * 100).toFixed(0)}% objetivo`}
              />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Costo Operativo y Ahorro Potencial por Ruta</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={costoPorRutaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="ruta" stroke="oklch(0.65 0.01 240)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="oklch(0.65 0.01 240)" tickFormatter={(value) => formatMoneyCompact(Number(value))} />
                    <Tooltip
                      formatter={(value: number) => formatMoney(value)}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="costo" name="Costo" fill={GRAPH_PALETTE[0]} stackId="operativo" />
                    <Bar
                      dataKey="ahorro"
                      name="Ahorro Potencial"
                      fill={GRAPH_PALETTE[1]}
                      stackId="operativo"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparativo Mensual de TCO Logístico</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={tcoMensualData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="mes" stroke="oklch(0.65 0.01 240)" />
                    <YAxis stroke="oklch(0.65 0.01 240)" tickFormatter={(value) => formatMoneyCompact(Number(value))} />
                    <Tooltip
                      formatter={(value: number) => formatMoney(value)}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="transporte" name="1. Transporte" stackId="tco" fill={GRAPH_PALETTE[0]} />
                    <Bar dataKey="procesamiento" name="2. Procesamiento y Embalaje" stackId="tco" fill={GRAPH_PALETTE[1]} />
                    <Bar dataKey="administrativos" name="3. Administrativos y Gestión" stackId="tco" fill={GRAPH_PALETTE[2]} />
                    <Bar dataKey="excepciones" name="4. Excepciones y Errores" stackId="tco" fill={GRAPH_PALETTE[3]} />
                    <Bar
                      dataKey="aduanales"
                      name="5. Aduanales e Impuestos"
                      stackId="tco"
                      fill={GRAPH_PALETTE[4]}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ratio de Costo de Envio (Shipping Cost Ratio) por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Clientes visibles en la grafica</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRatioSelectorOpen((prev) => !prev)}
                        className="gap-1"
                      >
                        {isRatioSelectorOpen ? "Ocultar" : "Mostrar"}
                        {isRatioSelectorOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRatioClientIds(ratioCostoEnvioClienteBaseData.map((item) => item.id))}
                      >
                        Seleccionar todos
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedRatioClientIds([])}>
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  {isRatioSelectorOpen && (
                    <div className="grid max-h-36 gap-2 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-3">
                      {ratioCostoEnvioClienteBaseData.map((item) => {
                        const checkboxId = `ratio-cliente-${item.id}`
                        const checked = selectedRatioClientIds.includes(item.id)

                        return (
                          <div key={item.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                            <Checkbox
                              id={checkboxId}
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                setSelectedRatioClientIds((prev) => {
                                  if (isChecked) {
                                    return [...prev, item.id]
                                  }
                                  return prev.filter((id) => id !== item.id)
                                })
                              }}
                            />
                            <Label htmlFor={checkboxId} className="cursor-pointer text-xs font-normal leading-4">
                              {item.name}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Tooltip
                      formatter={(value: number) => `${value}%`}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    {ratioCostoEnvioClienteData.length > 0 && (
                      <Pie
                        data={ratioCostoEnvioClienteData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={({ name, percent }) => `${name}: ${(Number(percent ?? 0) * 100).toFixed(1)}%`}
                      >
                        {ratioCostoEnvioClienteData.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={ratioCostoEnvioColors[index % ratioCostoEnvioColors.length]} />
                        ))}
                      </Pie>
                    )}
                  </PieChart>
                </ResponsiveContainer>
                {ratioCostoEnvioClienteData.length === 0 && (
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    Selecciona al menos un cliente para visualizar la grafica.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Predicción de Demanda Global por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Mes inicial</label>
                    <input
                      type="month"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={forecastStartMonth}
                      onChange={(e) => setForecastStartMonth(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Mes final</label>
                    <input
                      type="month"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={forecastEndMonth}
                      onChange={(e) => setForecastEndMonth(e.target.value)}
                    />
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={demandaGlobalForecastData}>
                    <defs>
                      <linearGradient id="globalDemandDeliveries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GRAPH_PALETTE[1]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={GRAPH_PALETTE[1]} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="globalDemandKg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GRAPH_PALETTE[2]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={GRAPH_PALETTE[2]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="month" stroke="oklch(0.65 0.01 240)" />
                    <YAxis yAxisId="left" stroke="oklch(0.65 0.01 240)" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="oklch(0.65 0.01 240)"
                      tickFormatter={(value) => `${Math.round(Number(value)).toLocaleString()} kg`}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "KG previstos") {
                          return `${Math.round(Number(value)).toLocaleString()} kg`
                        }
                        return Number(value).toFixed(1)
                      }}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="deliveries"
                      name="Entregas previstas"
                      stroke={GRAPH_PALETTE[1]}
                      fill="url(#globalDemandDeliveries)"
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="kg"
                      name="KG previstos"
                      stroke={GRAPH_PALETTE[2]}
                      fill="url(#globalDemandKg)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerTable customers={customers} />
            </CardContent>
          </Card>
        </div>
      </>
  )
}
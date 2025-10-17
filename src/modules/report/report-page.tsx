import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { ExportButton } from "@/modules/dashboard/components/export-button"
import { Input } from "@/shared/ui/input"
import { getRoutes, getKpis } from "@/modules/lib/api"
import type { Route, KpiSummary } from "@/modules/lib/types"
import { Calendar } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function ReportsPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [_kpis, setKpis] = useState<KpiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: "2025-01-10",
    end: "2025-01-10",
  })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [routesData, kpisData] = await Promise.all([
          getRoutes({ date: dateRange.start }),
          getKpis(dateRange.start),
        ])

        setRoutes(routesData)
        setKpis(kpisData)
      } catch (error) {
        console.error("Error loading reports data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dateRange])

  // Calculate comparison data (mock proposed vs executed)
  const comparisonData = routes.map((route) => ({
    route_id: route.id,
    proposed_km: route.estimated_km,
    executed_km: route.actual_km || route.estimated_km * 1.05,
    proposed_time: route.estimated_time_min,
    executed_time: route.actual_time_min || route.estimated_time_min * 1.08,
    capacity_util: route.capacity_util_pct,
    capacity_util_hl: route.capacity_util_pct_hl,
    status: route.status,
  }))

  // Chart data for visualization
  const chartData = comparisonData.slice(0, 8).map((item) => ({
    name: item.route_id,
    Proposed: item.proposed_km,
    Executed: item.executed_km,
  }))

  // Summary statistics
  const totalProposedKm = comparisonData.reduce((sum, item) => sum + item.proposed_km, 0)
  const totalExecutedKm = comparisonData.reduce((sum, item) => sum + item.executed_km, 0)
  const variance = totalExecutedKm - totalProposedKm
  const variancePercent = ((variance / totalProposedKm) * 100).toFixed(1)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading reports...</div>
      </div>
    )
  }

  return (
      <>
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Reports</h2>
              <p className="text-muted-foreground">Compare proposed vs executed routes and export data</p>
            </div>
            <ExportButton data={comparisonData} filename={`route-comparison-${dateRange.start}`} />
          </div>

          {/* Date Range Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-[180px]"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-[180px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{routes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Proposed Distance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProposedKm.toFixed(1)} km</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Executed Distance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExecutedKm.toFixed(1)} km</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {variance > 0 ? "+" : ""}
                {variance.toFixed(1)} km
              </div>
              <div className="text-sm text-muted-foreground">
                {variance > 0 ? "+" : ""}
                {variancePercent}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Proposed vs Executed Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0.01 240)" />
                <YAxis
                  stroke="oklch(0.65 0.01 240)"
                  label={{ value: "Distance (km)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 240)",
                    border: "1px solid oklch(0.25 0.02 240)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="Proposed" fill="#FF0000" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Executed" fill="#F5B027" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Route Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Route ID</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Proposed (km)</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Executed (km)</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Variance</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Capacity KG</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Capacity HL</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((item) => {
                    const variance = item.executed_km - item.proposed_km
                    const variancePercent = ((variance / item.proposed_km) * 100).toFixed(1)

                    return (
                      <tr key={item.route_id} className="border-b">
                        <td className="p-3 font-medium">{item.route_id}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              item.status === "completed"
                                ? "bg-chart-2/20 text-chart-2"
                                : item.status === "in_progress"
                                  ? "bg-chart-1/20 text-chart-1"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">{item.proposed_km.toFixed(1)}</td>
                        <td className="p-3 text-right">{item.executed_km.toFixed(1)}</td>
                        <td className="p-3 text-right">
                          <span className={variance > 0 ? "text-destructive" : "text-chart-2"}>
                            {variance > 0 ? "+" : ""}
                            {variance.toFixed(1)} ({variance > 0 ? "+" : ""}
                            {variancePercent}%)
                          </span>
                        </td>
                        <td className="p-3 text-right">{item.capacity_util}%</td>
                        <td className="p-3 text-right">{item.capacity_util_hl}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium">Route Efficiency</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {variance > 0
                  ? `Executed routes exceeded proposed distance by ${variance.toFixed(1)} km (${variancePercent}%). Consider reviewing route planning algorithms.`
                  : `Executed routes performed better than proposed, saving ${Math.abs(variance).toFixed(1)} km (${Math.abs(Number.parseFloat(variancePercent))}%).`}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium">Capacity Utilization</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Average capacity utilization across all routes is{" "}
                {(comparisonData.reduce((sum, item) => sum + item.capacity_util, 0) / comparisonData.length).toFixed(1)}
                %. Aim for 85-95% for optimal efficiency.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium">Completion Rate</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {comparisonData.filter((item) => item.status === "completed").length} of {comparisonData.length} routes
                completed (
                {(
                  (comparisonData.filter((item) => item.status === "completed").length / comparisonData.length) *
                  100
                ).toFixed(1)}
                %).
              </p>
            </div>
          </CardContent>
        </Card>
      </>
  )
}

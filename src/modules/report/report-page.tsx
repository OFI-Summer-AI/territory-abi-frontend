import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { ExportButton } from "@/modules/dashboard/components/export-button"
import { Input } from "@/shared/ui/input"
import { getAllCustomers } from "@/modules/lib/api"
import type { Customer } from "@/modules/lib/types"
import { Calendar } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: "2025-01-10",
    end: "2025-01-10",
  })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const customersData = await getAllCustomers()
        setCustomers(customersData)
      } catch (error) {
        console.error("Error loading reports data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dateRange])

  // Calculate comparison data (ordered vs delivered hectoliters)
  const comparisonData = customers.map((customer) => {
    const deliveries = customer.delivery_history || []
    const totalOrderedHL = deliveries.reduce((sum, delivery) => sum + delivery.ordered_hl, 0)
    const totalDeliveredHL = deliveries.reduce((sum, delivery) => sum + delivery.delivered_hl, 0)
    const completedDeliveries = deliveries.filter(d => d.status === "delivered" && d.delivered_hl > 0).length
    const totalDeliveries = deliveries.length
    const completionRate = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0
    
    return {
      customer_id: customer.id,
      customer_name: customer.name,
      proposed_hl: totalOrderedHL,
      delivered_hl: totalDeliveredHL,
      completion_rate: completionRate,
      total_deliveries: totalDeliveries,
      completed_deliveries: completedDeliveries,
      priority: customer.priority,
      frequency: customer.frequency,
    }
  })

  // Chart data for visualization
  const chartData = comparisonData.slice(0, 8).map((item) => ({
    name: item.customer_name,
    Ordered: item.proposed_hl,
    Delivered: item.delivered_hl,
  }))

  // Summary statistics
  const totalOrderedHL = comparisonData.reduce((sum, item) => sum + item.proposed_hl, 0)
  const totalDeliveredHL = comparisonData.reduce((sum, item) => sum + item.delivered_hl, 0)
  const variance = totalDeliveredHL - totalOrderedHL
  const variancePercent = totalOrderedHL > 0 ? ((variance / totalOrderedHL) * 100).toFixed(1) : "0"

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
              <h2 className="text-3xl font-bold">Customer Delivery Reports</h2>
              <p className="text-muted-foreground">Compare ordered vs delivered hectoliters and export customer data</p>
            </div>
            <ExportButton data={comparisonData} filename={`customer-delivery-report-${dateRange.start}`} />
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Ordered (HL)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrderedHL.toFixed(1)} HL</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Delivered (HL)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeliveredHL.toFixed(1)} HL</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivery Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {variance > 0 ? "+" : ""}
                {variance.toFixed(1)} HL
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
            <CardTitle>Ordered vs Delivered Hectoliters</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0.01 240)" />
                <YAxis
                  stroke="oklch(0.65 0.01 240)"
                  label={{ value: "Hectoliters (HL)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid oklch(0.25 0.02 240)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="Ordered" fill="#FF0000" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Delivered" fill="#F5B027" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Customer Delivery Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Priority</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Ordered (HL)</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Delivered (HL)</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Variance</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Completion Rate</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Total Deliveries</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((item) => {
                    const variance = item.delivered_hl - item.proposed_hl
                    const variancePercent = item.proposed_hl > 0 ? ((variance / item.proposed_hl) * 100).toFixed(1) : "0"

                    return (
                      <tr key={item.customer_id} className="border-b">
                        <td className="p-3 font-medium">{item.customer_name}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              item.priority === "high"
                                ? "bg-red-50 text-red-800"
                                : item.priority === "medium"
                                  ? "bg-yellow-50 text-yellow-800"
                                  : "bg-green-50 text-green-800"
                            }`}
                          >
                            {item.priority}
                          </span>
                        </td>
                        <td className="p-3 text-right">{item.proposed_hl.toFixed(1)}</td>
                        <td className="p-3 text-right">{item.delivered_hl.toFixed(1)}</td>
                        <td className="p-3 text-right">
                          <span className={variance > 0 ? "text-destructive" : "text-chart-2"}>
                            {variance > 0 ? "+" : ""}
                            {variance.toFixed(1)} ({variance > 0 ? "+" : ""}
                            {variancePercent}%)
                          </span>
                        </td>
                        <td className="p-3 text-right">{item.completion_rate.toFixed(1)}%</td>
                        <td className="p-3 text-right">{item.total_deliveries}</td>
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
              <h4 className="font-medium">Delivery Performance</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {variance > 0
                  ? `Delivered hectoliters exceeded ordered amount by ${variance.toFixed(1)} HL (${variancePercent}%). This may indicate over-delivery or data discrepancies.`
                  : `Delivered hectoliters were ${Math.abs(variance).toFixed(1)} HL less than ordered (${Math.abs(Number.parseFloat(variancePercent))}%). Consider reviewing delivery processes.`}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium">Customer Completion Rate</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Average completion rate across all customers is{" "}
                {(comparisonData.reduce((sum, item) => sum + item.completion_rate, 0) / comparisonData.length).toFixed(1)}
                %. Aim for 90%+ for optimal customer satisfaction.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium">High Priority Customers</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {comparisonData.filter((item) => item.priority === "high").length} high priority customers out of {comparisonData.length} total customers.
                Focus on maintaining high delivery rates for these customers.
              </p>
            </div>
          </CardContent>
        </Card>
      </>
  )
}

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { CustomerCard } from "@/modules/dashboard/components/customer-card"
import { getCustomer } from "@/modules/lib/api"
import type { Customer } from "@/modules/lib/types"
import { ArrowLeft, Beer, TrendingUp } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { PredictiveForecast } from "@/modules/customer/predictive-forecast"

export default function CustomerDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<
    | (Customer & {
        history: Array<{ month: string; deliveries: number; avg_kg: number; avg_hl: number }>
        prediction: { next_month_deliveries: number; confidence: number; trend: string }
      })
    | null
  >(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const customerData = await getCustomer(customerId)
        setCustomer(customerData)
      } catch (error) {
        console.error("Error loading customer details:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [customerId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading customer details...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Customer not found</p>
          <Button className="mt-4" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  // Derived metrics from delivery_history (HL only)
  const deliveries = customer.delivery_history || []
  const sortedDeliveries = [...deliveries].sort((a, b) => a.date.localeCompare(b.date))
  const last30 = sortedDeliveries.slice(-30)
  const totalDeliveries = deliveries.length
  const completedDeliveries = deliveries.filter((d) => d.status === "delivered" && d.delivered_hl > 0).length
  const failedDeliveries = totalDeliveries - completedDeliveries
  const completionRate = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0
  const totalDeliveredHL = deliveries.reduce((sum, d) => sum + (d.delivered_hl || 0), 0)
  const avgHLPerDelivery = totalDeliveries > 0 ? Math.round(totalDeliveredHL / totalDeliveries) : 0

  const performanceData = last30.map((d) => ({
    date: d.date,
    compliance: d.status === "delivered" && d.delivered_hl > 0 ? 100 : 0,
    delivered_hl: d.delivered_hl || 0,
  }))

  return (
      <>
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div>
            <h2 className="text-3xl font-bold">Customer Details</h2>
            <p className="text-muted-foreground">View and manage customer information</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Customer Info Card */}
            <CustomerCard customer={customer} />

            {/* Delivery Performance Chart (compliance by date and delivered HL) */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="date" stroke="oklch(0.65 0.01 240)" />
                    <YAxis yAxisId="left" stroke="oklch(0.65 0.01 240)" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="oklch(0.65 0.01 240)" />
                    <Tooltip
                      formatter={(value) => Number(value as number).toLocaleString()}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="compliance"
                      stroke="oklch(0.6 0.18 250)"
                      strokeWidth={2}
                      name="Compliance %"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="delivered_hl"
                      stroke="oklch(0.65 0.18 200)"
                      strokeWidth={2}
                      name="Delivered HL"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <PredictiveForecast customer={customer} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Total Deliveries</div>
                  <div className="text-xl font-bold">{totalDeliveries}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Completed Deliveries</div>
                  <div className="text-xl font-bold">{completedDeliveries}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Failed Deliveries</div>
                  <div className="text-xl font-bold">{failedDeliveries}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                  <div className="text-xl font-bold">{completionRate}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Delivered (HL)</div>
                  <div className="text-xl font-bold">{totalDeliveredHL.toLocaleString()} hl</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avg HL per Delivery</div>
                  <div className="text-xl font-bold">{avgHLPerDelivery} hl</div>
                </div>
              </CardContent>
            </Card>
            {/* Prediction */}
            <Card>
              <CardHeader>
                <CardTitle>Demand Prediction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Next Month Deliveries</div>
                      <div className="text-2xl font-bold">{customer.prediction.next_month_deliveries}</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-chart-2" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Next Month Hectoliters</div>
                      <div className="text-2xl font-bold">{customer.prediction.next_month_deliveries * customer.avg_order_hl}</div>
                    </div>
                    <Beer className="h-8 w-8 text-chart-3" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="text-xl font-bold">{Math.round(customer.prediction.confidence * 100)}%</div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-blue-400"
                          style={{ width: `${customer.prediction.confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground">Trend</div>
                      <div className="text-xl font-bold capitalize">{customer.prediction.trend}</div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Based on historical data and seasonal patterns, we predict this customer will require approximately{" "}
                    {customer.prediction.next_month_deliveries} deliveries next month.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
  )
}
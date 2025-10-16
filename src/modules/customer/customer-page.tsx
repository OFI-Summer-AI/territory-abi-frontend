import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { CustomerCard } from "@/modules/dashboard/components/customer-card"
import { getCustomer, getCenters } from "@/modules/lib/api"
import type { Customer, Center } from "@/modules/lib/types"
import { ArrowLeft, Beer, TrendingUp } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
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
  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenter, setSelectedCenter] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [customerData, centersData] = await Promise.all([getCustomer(customerId), getCenters()])

        setCustomer(customerData)
        setSelectedCenter(customerData.center_id)
        setCenters(centersData)
      } catch (error) {
        console.error("Error loading customer details:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [customerId])

  const handleReassign = () => {
    if (selectedCenter && customer) {
      alert(`Customer reassigned to center: ${selectedCenter} (mock action)`)
    }
  }

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

            {/* Delivery History Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery History</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatHistoryWithLast12Months(customer.history)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                    <XAxis dataKey="month" stroke="oklch(0.65 0.01 240)" />
                    <YAxis stroke="oklch(0.65 0.01 240)"  />
                    <Tooltip
                    formatter={(value) => Number(value as number).toFixed(1)}
                      contentStyle={{
                        backgroundColor: "oklch(0.18 0.02 240)",
                        border: "1px solid oklch(0.25 0.02 240)",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="deliveries"
                      stroke="oklch(0.6 0.18 250)"
                      strokeWidth={2}
                      name="Deliveries"
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_kg"
                      stroke="oklch(0.65 0.18 35)"
                      strokeWidth={2}
                      name="Avg Weight (kg)"
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_hl"
                      stroke="oklch(0.65 0.18 200)"
                      strokeWidth={2}
                      name="Avg Weight (hl)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <PredictiveForecast customer={customer} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reassign Center */}
            <Card>
              <CardHeader>
                <CardTitle>Reassign Center</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Current Center</label>
                  <p className="font-medium">{centers.find((c) => c.id === customer.center_id)?.name}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">New Center</label>
                  <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select center" />
                    </SelectTrigger>
                    <SelectContent>
                      {centers.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleReassign} disabled={selectedCenter === customer.center_id}>
                  Reassign Customer
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Total Deliveries (12 months)</div>
                  <div className="text-xl font-bold">{customer.history.reduce((sum, h) => sum + h.deliveries, 0)}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Avg Monthly Deliveries</div>
                  <div className="text-xl font-bold">
                    {Math.round(customer.history.reduce((sum, h) => sum + h.deliveries, 0) / customer.history.length)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Avg Weight per Delivery</div>
                  <div className="text-xl font-bold">{customer.avg_order_kg} kg</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Weight (12 months)</div>
                  <div className="text-xl font-bold">
                    {Math.round(customer.history.reduce((sum, h) => sum + h.avg_kg * h.deliveries, 0)).toLocaleString()}{" "}
                    kg
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avg Weight per Delivery HL</div>
                  <div className="text-xl font-bold">{customer.avg_order_hl} hl</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Weight HL (12 months)</div>
                  <div className="text-xl font-bold">
                    {Math.round(customer.history.reduce((sum, h) => sum + h.avg_hl * h.deliveries, 0)).toLocaleString()}{" "}
                    hl
                  </div>
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

function formatHistoryWithLast12Months(
  history: Array<{ month: string; deliveries: number; avg_kg: number; avg_hl: number }>,
) {
  // Build labels for the last 12 months ending with current month
  const now = new Date()
  const labels: string[] = []
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1)
  // We want 12 labels: from 11 months ago up to current month
  for (let i = 11; i >= 0; i--) {
    const d = new Date(cursor)
    d.setMonth(cursor.getMonth() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    labels.push(`${y}-${m}`)
  }

  // Align existing history values (assumed length 12) to those labels
  const values = history.slice(-12)
  const padded = Array.from({ length: 12 }, (_, idx) => values[idx] || values[values.length - 1])

  return padded.map((h, idx) => ({
    month: labels[idx],
    deliveries: h.deliveries,
    avg_kg: h.avg_kg,
    avg_hl: h.avg_hl,
  }))
}
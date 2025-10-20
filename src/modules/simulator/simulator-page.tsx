import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { SimulatorPanel } from "@/modules/dashboard/components/simulator-panel"
import { KpiComparison } from "@/modules/dashboard/components/kpi-comparison"
import { RoutesTable } from "@/modules/dashboard/components/routes-table"
import { Button } from "@/shared/ui/button"
import { getCenters, simulateRoutes } from "@/modules/lib/api"
import type { Center, SimulationResult } from "@/modules/lib/types"
import { RotateCcw } from "lucide-react"

export default function SimulatorPage() {
  const navigate = useNavigate()
  const [centers, setCenters] = useState<Center[]>([])
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const centersData = await getCenters()
        setCenters(centersData)
      } catch (error) {
        console.error("Error loading simulator data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSimulate = async (centerId: string, date: string) => {
    setSimulating(true)
    try {
      const result = await simulateRoutes({
        center_id: centerId,
        date,
      })
      setSimulationResult(result)
    } catch (error) {
      console.error("Error simulating routes:", error)
      alert("Error generating route proposal. Please try again.")
    } finally {
      setSimulating(false)
    }
  }

  const handleReset = () => {
    setSimulationResult(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading simulator...</div>
      </div>
    )
  }

  return (
      <>
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Route Simulator</h2>
              <p className="text-muted-foreground">Generate optimized route proposals based on selected customers</p>
            </div>
            {simulationResult && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Simulator Panel */}
          <div className="lg:col-span-1">
            <SimulatorPanel
              centers={centers}
              onSimulate={handleSimulate}
              loading={simulating}
            />
          </div>

          {/* Results */}
          <div className="space-y-6 lg:col-span-2">
            {simulationResult ? (
              <>
                {/* KPI Comparison */}
                <KpiComparison
                  current={simulationResult.current_kpis}
                  proposed={simulationResult.proposed_kpis}
                  savings={simulationResult.savings}
                />

                {/* Proposed Routes */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Proposed Routes ({simulationResult.proposed_routes.length})</h3>
                  <RoutesTable
                    routes={simulationResult.proposed_routes}
                    onView={(id) => navigate(`/routes/${id}`)}
                  />
                </div>

                {/* Implementation Note */}
                <div className="rounded-lg border border-chart-1 bg-chart-1/10 p-4">
                  <h4 className="font-medium">Implementation Notes</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This simulation uses a greedy clustering algorithm to group customers by proximity and vehicle
                    capacity. The proposed routes optimize for capacity utilization while minimizing total distance and
                    time. Review the routes above and adjust as needed before implementation.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <p className="text-muted-foreground">Select a center and click "Generate Route Proposal"</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The simulator will create optimized routes for all customers in the center
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
  )
}

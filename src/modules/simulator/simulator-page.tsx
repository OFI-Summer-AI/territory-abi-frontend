import { useEffect, useState } from "react"
import { SimulatorPanel } from "@/modules/dashboard/components/simulator-panel"
import { KpiComparison } from "@/modules/dashboard/components/kpi-comparison"
import { RoutesTable } from "@/modules/dashboard/components/routes-table"
import { ComplianceAnalysis } from "@/modules/dashboard/components/compliance-analysis"
import { MapComparison } from "@/modules/dashboard/components/map-comparison"
import { Button } from "@/shared/ui/button"
import { getCenters, simulateRoutes, simulateCompliance } from "@/modules/lib/api"
import type { Center, SimulationResult, ComplianceSimulationResult, OptimizationSuggestion } from "@/modules/lib/types"
import { RotateCcw } from "lucide-react"

export default function SimulatorPage() {
  const [centers, setCenters] = useState<Center[]>([])
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [complianceResult, setComplianceResult] = useState<ComplianceSimulationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [showCompliance, setShowCompliance] = useState(false)
  const [showMapComparison, setShowMapComparison] = useState(false)

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
      // Run route simulation
      const routeResult = await simulateRoutes({
        center_id: centerId,
        date,
      })
      setSimulationResult(routeResult)

      // Run coverage simulation
      const complianceResult = await simulateCompliance(centerId)
      setComplianceResult(complianceResult)
      setShowCompliance(true)
    } catch (error) {
      console.error("Error simulating routes:", error)
      alert("Error generating route proposal. Please try again.")
    } finally {
      setSimulating(false)
    }
  }

  const handleReset = () => {
    setSimulationResult(null)
    setComplianceResult(null)
    setShowCompliance(false)
  }

  const handleViewMap = () => {
    if (complianceResult) {
      setShowMapComparison(true)
    }
  }

  const handleApplySuggestions = (suggestions: OptimizationSuggestion[]) => {
    // TODO: Implement suggestion application
    console.log('Applying suggestions:', suggestions)
    alert(`Applying ${suggestions.length} optimization suggestions...`)
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
              <h2 className="text-3xl font-bold">Route Simulator & Coverage Analysis</h2>
              <p className="text-muted-foreground">Generate optimized route proposals and analyze customer coverage</p>
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
                {/* Navigation Tabs */}
                <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                  <button
                    onClick={() => setShowCompliance(false)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      !showCompliance
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Route Optimization
                  </button>
                  {complianceResult && (
                    <button
                      onClick={() => setShowCompliance(true)}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        showCompliance
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Coverage Analysis
                    </button>
                  )}
                </div>

                {!showCompliance ? (
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
                      />
                    </div>

                    {/* Implementation Note */}
                    <div className="rounded-lg border border-chart-1 bg-chart-1/10 p-4">
                      <h4 className="font-medium">Implementation Notes</h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        This simulation uses territory optimization to assign customers to the most efficient zones based on proximity and vehicle capacity. The generated routes aim to maximize resource utilization and minimize total distance and time. Review the proposed territories and routes above and make adjustments as needed before implementation.
                      </p>
                    </div>
                  </>
                ) : complianceResult ? (
                  <ComplianceAnalysis
                    result={complianceResult}
                    onViewMap={handleViewMap}
                    onApplySuggestions={handleApplySuggestions}
                  />
                ) : (
                  <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
                    <div className="text-center">
                      <p className="text-muted-foreground">Coverage analysis is running...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <p className="text-muted-foreground">Select a center and click "Generate Route Proposal"</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The simulator will create optimized routes and analyze coverage for all customers in the center
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Comparison Modal */}
        {showMapComparison && complianceResult && (
          <MapComparison
            complianceResult={complianceResult}
            onClose={() => setShowMapComparison(false)}
          />
        )}
      </>
  )
}

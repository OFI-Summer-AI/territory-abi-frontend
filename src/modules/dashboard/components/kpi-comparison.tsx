import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import type { KpiSummary } from "@/modules/lib/types"
import { TrendingDown, TrendingUp } from "lucide-react"

interface KpiComparisonProps {
  current: KpiSummary
  proposed: KpiSummary
  savings: {
    km_saved: number
    time_saved_hours: number
    cost_saved?: number
  }
}

export function KpiComparison({ current, proposed, savings }: KpiComparisonProps) {
  const calculateChange = (current: number, proposed: number) => {
    const change = ((proposed - current) / current) * 100
    return change.toFixed(1)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rendimiento Actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Rutas Totales</div>
              <div className="text-2xl font-bold">{current.total_routes}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Distancia Total</div>
              <div className="text-2xl font-bold">{current.total_km} km</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tiempo Total</div>
              <div className="text-2xl font-bold">{current.total_time_hours} h</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Capacidad Prom.</div>
              <div className="text-2xl font-bold">{current.avg_capacity_util}%</div>
            </div>
          </CardContent>
        </Card>

        {/* Proposed KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rendimiento Propuesto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Rutas Totales</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{proposed.total_routes}</div>
                {proposed.total_routes < current.total_routes && (
                  <span className="flex items-center text-sm text-chart-2">
                    <TrendingDown className="h-4 w-4" />
                    {calculateChange(current.total_routes, proposed.total_routes)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Distancia Total</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{proposed.total_km} km</div>
                {proposed.total_km < current.total_km && (
                  <span className="flex items-center text-sm text-chart-2">
                    <TrendingDown className="h-4 w-4" />
                    {calculateChange(current.total_km, proposed.total_km)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tiempo Total</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{proposed.total_time_hours} h</div>
                {proposed.total_time_hours < current.total_time_hours && (
                  <span className="flex items-center text-sm text-chart-2">
                    <TrendingDown className="h-4 w-4" />
                    {calculateChange(current.total_time_hours, proposed.total_time_hours)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Capacidad Prom.</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{proposed.avg_capacity_util}%</div>
                {proposed.avg_capacity_util > current.avg_capacity_util && (
                  <span className="flex items-center text-sm text-chart-2">
                    <TrendingUp className="h-4 w-4" />
                    {calculateChange(current.avg_capacity_util, proposed.avg_capacity_util)}%
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Summary */}
      <Card className="border-chart-2 bg-chart-2/10">
        <CardHeader>
          <CardTitle className="text-lg">Ahorro Estimado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Distancia Ahorrada</div>
              <div className="text-2xl font-bold text-chart-2">{savings.km_saved} km</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tiempo Ahorrado</div>
              <div className="text-2xl font-bold text-chart-2">{savings.time_saved_hours} h</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Rutas Reducidas</div>
              <div className="text-2xl font-bold text-chart-2">{current.total_routes - proposed.total_routes}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
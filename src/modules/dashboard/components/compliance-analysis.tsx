import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Target, 
  MapPin, 
  Users,
  Calendar,
  Truck
} from "lucide-react"
import type { ComplianceSimulationResult, OptimizationSuggestion } from "@/modules/lib/types"

interface ComplianceAnalysisProps {
  result: ComplianceSimulationResult
  onViewMap: () => void
  onApplySuggestions: (suggestions: OptimizationSuggestion[]) => void
}

export function ComplianceAnalysis({ result, onViewMap, onApplySuggestions }: ComplianceAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'clients' | 'solutions' | 'validation'>('clients')
  
  const { 
    non_compliant_clients, 
    optimization_suggestions, 
    impact_analysis, 
    validation_results 
  } = result

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Crítica'
      case 'high': return 'Alta'
      case 'medium': return 'Media'
      case 'low': return 'Baja'
      default: return 'Desconocida'
    }
  }

  const getValidationStatusLabel = (status: string) => {
    switch (status) {
      case 'validated': return 'validada'
      case 'pending': return 'pendiente'
      case 'rejected': return 'rechazada'
      default: return status
    }
  }

  const getSuggestionTypeLabel = (type: string) => {
    switch (type) {
      case 'route_reassignment': return 'reasignación de ruta'
      case 'schedule_adjustment': return 'ajuste de horario'
      case 'frequency_optimization': return 'optimización de frecuencia'
      case 'capacity_rebalance': return 'reequilibrio de capacidad'
      default: return type.replace('_', ' ')
    }
  }

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'frequency': return <Calendar className="h-4 w-4" />
      case 'delivery_success': return <Target className="h-4 w-4" />
      case 'delivery_time': return <Clock className="h-4 w-4" />
      case 'capacity': return <Truck className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Coverage Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resumen de Análisis de Cobertura
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onViewMap}>
                <MapPin className="mr-2 h-4 w-4" />
                Ver en Mapa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-destructive">
                {non_compliant_clients.length}
              </div>
              <div className="text-sm text-muted-foreground">Clientes No Cubiertos</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {optimization_suggestions.length}
              </div>
              <div className="text-sm text-muted-foreground">Soluciones Disponibles</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {impact_analysis.improvements.delivery_success_rate_change.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Mejora Esperada de Cobertura</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {impact_analysis.improvements.efficiency_improvement_hl_km.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Mejora de HL/Km</div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Impacto Esperado</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tasa de Entrega Exitosa</span>
                  <span className="text-sm font-medium text-green-600">
                    +{impact_analysis.improvements.delivery_success_rate_change.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${impact_analysis.after.avg_delivery_success_rate}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cobertura de Frecuencia</span>
                  <span className="text-sm font-medium text-green-600">
                    +{impact_analysis.improvements.frequency_compliance_improvement.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${impact_analysis.after.avg_frequency_adherence}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'clients' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Clientes No Cubiertos
        </button>
        <button
          onClick={() => setActiveTab('solutions')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'solutions' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Soluciones de Optimización
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'validation' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Validación de Impacto
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {non_compliant_clients.map((client) => (
            <Card key={client.customer.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{client.customer.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client.customer.address}</p>
                  </div>
                  <Badge variant={getSeverityColor(client.issues[0]?.severity || 'low')}>
                    Prioridad {getSeverityLabel(client.issues[0]?.severity || 'low')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Tasa de Éxito</div>
                    <div className="text-muted-foreground">
                      {client.current_metrics.delivery_success_rate.toFixed(1)}% 
                      (Objetivo: {client.target_metrics.delivery_success_rate}%)
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Frecuencia</div>
                    <div className="text-muted-foreground">
                      Cada {client.current_metrics.avg_delivery_frequency_days} días
                      (Objetivo: {client.target_metrics.target_frequency_days} días)
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Última Entrega</div>
                    <div className="text-muted-foreground">
                      {client.current_metrics.last_delivery_date}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium">Problemas Identificados:</h5>
                  {client.issues.map((issue, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <div className="font-medium">{issue.description}</div>
                        <div className="text-sm text-muted-foreground">{issue.impact}</div>
                      </div>
                      <Badge variant={getSeverityColor(issue.severity)}>
                          {getSeverityLabel(issue.severity)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'solutions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Sugerencias de Optimización</h3>
            <Button 
              onClick={() => onApplySuggestions(optimization_suggestions)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Aplicar Todas las Soluciones
            </Button>
          </div>

          {optimization_suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-medium">{suggestion.description}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tipo: {getSuggestionTypeLabel(suggestion.type)} • 
                      HL/Km: {suggestion.expected_benefit.efficiency_hl_km.toFixed(2)}
                    </p>
                  </div>
                  <Badge 
                    variant={suggestion.validation_status === 'validated' ? 'default' : 'secondary'}
                  >
                    {getValidationStatusLabel(suggestion.validation_status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-green-600">
                      +{suggestion.expected_benefit.delivery_success_improvement.toFixed(1)}%
                    </div>
                    <div className="text-muted-foreground">Tasa de Éxito</div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">
                      -{suggestion.expected_benefit.time_reduction_hours.toFixed(1)}h
                    </div>
                    <div className="text-muted-foreground">Tiempo Ahorrado</div>
                  </div>
                  <div>
                    <div className="font-medium text-green-600">
                      {suggestion.expected_benefit.efficiency_hl_km.toFixed(2)}
                    </div>
                    <div className="text-muted-foreground">Eficiencia HL/Km</div>
                  </div>
                  <div>
                    <div className="font-medium">
                      {suggestion.affected_routes.length}
                    </div>
                    <div className="text-muted-foreground">Rutas Afectadas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {validation_results.no_negative_impact ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                Validación de Impacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                validation_results.no_negative_impact 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center gap-2">
                  {validation_results.no_negative_impact ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <p className={`text-sm ${
                    validation_results.no_negative_impact ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {validation_results.no_negative_impact 
                      ? 'Todos los cambios propuestos han sido validados. No hay impacto negativo en los clientes actualmente conformes.'
                      : 'Algunos cambios propuestos pueden afectar a clientes actualmente conformes. Revisa las advertencias a continuación.'
                    }
                  </p>
                </div>
              </div>

              {validation_results.warnings.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-yellow-600">Advertencias:</h5>
                  {validation_results.warnings.map((warning, index) => (
                    <div key={index} className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-sm text-yellow-800">{warning}</p>
                    </div>
                  ))}
                </div>
              )}

              {validation_results.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-blue-600">Recomendaciones:</h5>
                  {validation_results.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800">{rec}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <h5 className="font-medium mb-3">Comparación Antes vs Después</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h6 className="font-medium text-muted-foreground">Estado Actual</h6>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Tasa de Cobertura:</span>
                        <span>{impact_analysis.before.compliance_rate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Eficiencia HL/Km:</span>
                        <span>{impact_analysis.before.avg_hl_km_efficiency.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tasa de Éxito:</span>
                        <span>{impact_analysis.before.avg_delivery_success_rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h6 className="font-medium text-green-600">Estado Proyectado</h6>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Tasa de Cobertura:</span>
                        <span className="text-green-600">
                          {impact_analysis.after.compliance_rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Eficiencia HL/Km:</span>
                        <span className="text-green-600">
                          {impact_analysis.after.avg_hl_km_efficiency.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tasa de Éxito:</span>
                        <span className="text-green-600">
                          {impact_analysis.after.avg_delivery_success_rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { Input } from "@/shared/ui/input"
import { Badge } from "@/shared/ui/badge"
import type { Center, CenterVehicle } from "@/modules/lib/types"
import { Play, Truck, Users } from "lucide-react"

interface SimulatorPanelProps {
  centers: Center[]
  onSimulate: (centerId: string, date: string) => void
  loading?: boolean
}

export function SimulatorPanel({
  centers,
  onSimulate,
  loading,
}: SimulatorPanelProps) {
  const [selectedCenter, setSelectedCenter] = useState<string>(centers[0]?.id || "")
  const [selectedDate, setSelectedDate] = useState<string>("2025-01-11")

  const selectedCenterData = centers.find(center => center.id === selectedCenter)

  const handleSimulate = () => {
    if (!selectedCenter) {
      alert("Selecciona un centro")
      return
    }
    onSimulate(selectedCenter, selectedDate)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador de Rutas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Centro de Distribución</label>
          <Select value={selectedCenter} onValueChange={setSelectedCenter}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar centro" />
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha</label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>

        {selectedCenterData && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Vehículos Disponibles ({selectedCenterData.vehicles?.length || 0})
              </h4>
              {selectedCenterData.vehicles && selectedCenterData.vehicles.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {selectedCenterData.vehicles.map((vehicle: CenterVehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between text-xs bg-background rounded p-2">
                      <span className="font-medium">{vehicle.plate}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {vehicle.type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {vehicle.capacity_kg}kg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No hay vehículos disponibles</p>
              )}
            </div>

            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Personal Disponible
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{selectedCenterData.employees || 0}</span>
                <span className="text-sm text-muted-foreground">empleados disponibles</span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            El simulador incluirá automáticamente todos los clientes asignados al centro de distribución seleccionado y generará rutas optimizadas.
          </p>
        </div>

        <Button className="w-full" onClick={handleSimulate} disabled={loading || !selectedCenter}>
          <Play className="mr-2 h-4 w-4" />
          {loading ? "Generando..." : "Generar Predicciones y Análisis"}
        </Button>
      </CardContent>
    </Card>
  )
}
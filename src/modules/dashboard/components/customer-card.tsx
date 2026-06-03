import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import type { Customer } from "@/modules/lib/types"
import { MapPin, Calendar, AlertCircle, Beer } from "lucide-react"

interface CustomerCardProps {
  customer: Customer
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const getPriorityColor = (priority: Customer["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-800 border-red-800"
      case "medium":
        return "bg-yellow-50 text-yellow-800 border-yellow-800"
      case "low":
        return "bg-green-50 text-green-800 border-green-800"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getFrequencyLabel = (frequency: Customer["frequency"]) => {
    switch (frequency) {
      case "daily":
        return "Diaria"
      case "weekly":
        return "Semanal"
      case "biweekly":
        return "Quincenal"
      case "monthly":
        return "Mensual"
      default:
        return frequency
    }
  }

  const getPriorityLabel = (priority: Customer["priority"]) => {
    switch (priority) {
      case "high":
        return "Alta"
      case "medium":
        return "Media"
      case "low":
        return "Baja"
      default:
        return priority
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{customer.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{customer.address}</p>
          </div>
          <Badge className={getPriorityColor(customer.priority)}>{getPriorityLabel(customer.priority)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">Ubicación</div>
              <div className="font-medium">
                {customer.lat.toFixed(4)}, {customer.lng.toFixed(4)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Beer className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">Pedido Prom. Kg</div>
              <div className="font-medium">{customer.avg_order_kg} Kg</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">Frecuencia</div>
              <div className="font-medium">{getFrequencyLabel(customer.frequency)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">Estado</div>
              <div className="font-medium">{customer.active ? "Activo" : "Inactivo"}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
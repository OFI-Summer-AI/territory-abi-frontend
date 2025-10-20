import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Link } from "react-router-dom"
import type { Customer } from "@/modules/lib/types"
import { Eye } from "lucide-react"

interface CustomerTableProps {
  customers: Customer[]
  onView?: (customerId: string) => void
}

export function CustomerTable({ customers, onView }: CustomerTableProps) {
  

  const getEffectiveDeliveries = (customer: Customer) => {
    const totalDeliveries = customer.delivery_history.length
    const effectiveDeliveries = customer.delivery_history.filter(d => d.status === "delivered").length
    const ineffectiveDeliveries = totalDeliveries - effectiveDeliveries
    
    return { effective: effectiveDeliveries, ineffective: ineffectiveDeliveries }
  }

  const getDeliveryCompletionRate = (customer: Customer) => {
    const totalDeliveries = customer.delivery_history.length
    if (totalDeliveries === 0) return 0
    
    const completedDeliveries = customer.delivery_history.filter(d => d.status === "delivered").length
    return Math.round((completedDeliveries / totalDeliveries) * 100)
  }

  const getTotalHectolitersDelivered = (customer: Customer) => {
    return customer.delivery_history.reduce((total, delivery) => {
      return total + delivery.delivered_hl
    }, 0)
  }

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

  const getFrequencyColor = (frequency: Customer["frequency"]) => {
    switch (frequency) {
      case "daily":
        return "bg-blue-50 text-blue-800 border-blue-800"
      case "weekly":
        return "bg-purple-50 text-purple-800 border-purple-800"
      case "biweekly":
        return "bg-orange-50 text-orange-800 border-orange-800"
      case "monthly":
        return "bg-gray-50 text-gray-800 border-gray-800"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Effective Deliveries</TableHead>
            <TableHead>Completed Deliveries</TableHead>
            <TableHead>Delivered HL</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const deliveryStats = getEffectiveDeliveries(customer)
            const completionRate = getDeliveryCompletionRate(customer)
            const totalHL = getTotalHectolitersDelivered(customer)
            
            return (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.id}</TableCell>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">{customer.address}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="text-green-600 font-medium">{deliveryStats.effective} effective</div>
                    <div className="text-red-600">{deliveryStats.ineffective} ineffective</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                      <div 
                        className={`h-full ${
                          completionRate >= 90 ? 'bg-green-500' : 
                          completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${completionRate}%` }} 
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{completionRate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{totalHL.toLocaleString()} HL</div>
                  <div className="text-xs text-muted-foreground">Average: {customer.avg_order_hl} HL</div>
                </TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(customer.priority)}>
                    {customer.priority === "high" ? "High" : 
                     customer.priority === "medium" ? "Medium" : "Low"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getFrequencyColor(customer.frequency)}>
                    {customer.frequency === "daily" ? "Daily" :
                     customer.frequency === "weekly" ? "Weekly" :
                     customer.frequency === "biweekly" ? "Bi-weekly" : "Monthly"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/customers/${customer.id}`}>
                      <Button variant="ghost" size="sm" onClick={() => onView?.(customer.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

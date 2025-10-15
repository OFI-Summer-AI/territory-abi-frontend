"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { Input } from "@/shared/ui/input"
import type { Customer, Center } from "@/modules/lib/types"
import { Play } from "lucide-react"

interface SimulatorPanelProps {
  customers: Customer[]
  centers: Center[]
  selectedCustomers: string[]
  onCustomerToggle: (customerId: string) => void
  onSimulate: (centerId: string, date: string) => void
  loading?: boolean
}

export function SimulatorPanel({
  customers,
  centers,
  selectedCustomers,
  onCustomerToggle,
  onSimulate,
  loading,
}: SimulatorPanelProps) {
  const [selectedCenter, setSelectedCenter] = useState<string>(centers[0]?.id || "")
  const [selectedDate, setSelectedDate] = useState<string>("2025-01-11")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCustomers = customers.filter((customer) => {
    if (searchQuery) {
      return (
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return true
  })

  const handleSimulate = () => {
    if (selectedCustomers.length === 0) {
      alert("Please select at least one customer")
      return
    }
    if (!selectedCenter) {
      alert("Please select a center")
      return
    }
    onSimulate(selectedCenter, selectedDate)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Route Simulator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Distribution Center</label>
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select Customers ({selectedCustomers.length} selected)</label>
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="max-h-[400px] space-y-2 overflow-y-auto rounded-lg border p-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="flex items-start gap-2">
                <Checkbox
                  id={customer.id}
                  checked={selectedCustomers.includes(customer.id)}
                  onCheckedChange={() => onCustomerToggle(customer.id)}
                />
                <label htmlFor={customer.id} className="flex-1 cursor-pointer text-sm">
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {customer.address} • {customer.avg_order_kg} kg
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={handleSimulate} disabled={loading || selectedCustomers.length === 0}>
          <Play className="mr-2 h-4 w-4" />
          {loading ? "Generating..." : "Generate Route Proposal"}
        </Button>
      </CardContent>
    </Card>
  )
}
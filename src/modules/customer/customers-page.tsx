import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CustomerTable } from "@/modules/customer/customer-table"
import { getAllCustomers } from "@/modules/lib/api"
import type { Customer } from "@/modules/lib/types"

export default function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true)
      try {
        const data = await getAllCustomers()
        setCustomers(data)
      } catch (error) {
        console.error("Error loading customers:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [])

  return (
    <>
      <div className="mb-6 space-y-2">
        <h2 className="text-3xl font-bold">Clientes</h2>
        <p className="text-muted-foreground">Lista consolidada de todos los clientes y su desempeno logistico</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Cargando clientes...</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Mostrando {customers.length} clientes</div>
          <CustomerTable customers={customers} onView={(id) => navigate(`/customers/${id}`)} />
        </div>
      )}
    </>
  )
}
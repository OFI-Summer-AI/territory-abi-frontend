import { Input } from "@/shared/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { Button } from "@/shared/ui/button"
import { Search, X } from "lucide-react"

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  centerId: string
  onCenterChange: (value: string) => void
  date: string
  onDateChange: (value: string) => void
  centers: Array<{ id: string; name: string }>
  onClear?: () => void
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  centerId,
  onCenterChange,
  date,
  onDateChange,
  centers,
  onClear,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar rutas..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={centerId} onValueChange={onCenterChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos los Centros" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los Centros</SelectItem>
          {centers.map((center) => (
            <SelectItem key={center.id} value={center.id}>
              {center.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} className="w-[180px]" />

      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
import { create } from "zustand"

interface AppState {
  viewMode: "map" | "table"
  setViewMode: (mode: "map" | "table") => void
  selectedRouteId: string | null
  setSelectedRouteId: (id: string | null) => void
  selectedCenterId: string | null
  setSelectedCenterId: (id: string | null) => void
}

export const useAppStore = create<AppState>()((set) => ({
  viewMode: "map",
  setViewMode: (mode) => set({ viewMode: mode }),
  selectedRouteId: null,
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),
  selectedCenterId: null,
  setSelectedCenterId: (id) => set({ selectedCenterId: id }),
}))

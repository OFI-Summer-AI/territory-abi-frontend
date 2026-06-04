import { Outlet, NavLink } from "react-router-dom"
import { Button } from "@/shared/ui/button"
import { ChatModal } from "@/shared/ui/chat-modal"

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Planificador de Territorio</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <NavLink to="/" end>
                Panel
              </NavLink>
            </Button>
            <Button asChild variant="ghost">
              <NavLink to="/routes">
                Rutas
              </NavLink>
            </Button>
            <Button asChild variant="ghost">
              <NavLink to="/simulator" className={({ isActive }) => (isActive ? "font-semibold" : undefined)}>
                Simulador
              </NavLink>
            </Button>
            <Button asChild variant="ghost">
              <NavLink to="/reports">
                Informes
              </NavLink>
            </Button>
            <ChatModal />
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout



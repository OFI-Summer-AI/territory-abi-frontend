import { Outlet, NavLink } from "react-router-dom"
import { Button } from "@/shared/ui/button"

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/src/assets/abi-logo.png" alt="ABI Territory" className="h-10 w-40" />
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <NavLink to="/" end>
                Dashboard
              </NavLink>
            </Button>
            <Button asChild variant="ghost">
              <NavLink to="/routes">
                Routes
              </NavLink>
            </Button>
            <Button asChild variant="ghost">
              <NavLink to="/simulator" className={({ isActive }) => (isActive ? "font-semibold" : undefined)}>
                Simulator
              </NavLink>
            </Button>
            <Button asChild variant="ghost">
              <NavLink to="/reports">
                Reports
              </NavLink>
            </Button>
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



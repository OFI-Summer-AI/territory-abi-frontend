import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/shared/layout/app-layout'
import DashboardPage from '@/modules/dashboard/dashboard-page'
import ReportsPage from '@/modules/report/report-page'
import RouteDetailPage from '@/modules/routes/route-detail-page'
import RoutesPage from '@/modules/routes/route-page'
import CustomerDetailPage from '@/modules/customer/customer-page'
import SimulatorPage from '@/modules/simulator/simulator-page'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="routes/:id" element={<RouteDetailPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App

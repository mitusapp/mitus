import { Link, Route, Routes } from 'react-router-dom'
import LandingEventType from './pages/LandingEventType'
import Wizard from './pages/Wizard'
import PreviewTrialPage from './pages/PreviewTrialPage'
import PublicInvitationPage from './pages/PublicInvitationPage'
import UserAuthLoginRegister from './pages/UserAuthLoginRegister'
import OwnerDashboard from './pages/OwnerDashboard'
import Checkout from './pages/Checkout'
import InvitationEditor from './pages/InvitationEditor'
import { ProtectedRoute } from './lib/auth'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex items-center justify-between py-3">
          <Link to="/" className="font-semibold">Mitus</Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/wizard">Crear tarjeta de prueba</Link>
            <Link to="/user-authentication-login-register">Ingresar</Link>
            <Link to="/owner-dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingEventType />} />
          <Route path="/wizard" element={<Wizard />} />
          <Route path="/preview/:token" element={<PreviewTrialPage />} />
          <Route path="/i/:slug" element={<PublicInvitationPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/user-authentication-login-register" element={<UserAuthLoginRegister />} />
          <Route path="/owner-dashboard" element={<ProtectedRoute><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/invitation-editor/:id" element={<ProtectedRoute><InvitationEditor /></ProtectedRoute>} />
        </Routes>
      </main>

      <footer className="border-t">
        <div className="container py-6 text-sm text-gray-500">© {new Date().getFullYear()} Mitus</div>
      </footer>
    </div>
  )
}
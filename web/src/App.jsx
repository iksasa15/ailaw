import { Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from './app/SettingsContext'
import { AppShell } from './components/layout/AppShell'
import { PlatformShell } from './components/platform/PlatformShell'
import { RequireRole } from './components/platform/RequireRole'
import Home from './pages/Home'
import Settings from './pages/Settings'
import About from './pages/About'
import Guide from './pages/Guide'
import ScreenPick from './pages/ScreenPick'
import PairJoin from './pages/PairJoin'
import Lab from './pages/Lab'
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import RoleHome from './pages/app/RoleHome'
import LawyersDirectory from './pages/app/LawyersDirectory'
import LawyerProfile from './pages/app/LawyerProfile'
import Sessions from './pages/app/Sessions'
import Requests from './pages/app/Requests'
import Availability from './pages/app/Availability'
import SessionRoom from './pages/app/SessionRoom'
import SessionRecord from './pages/app/SessionRecord'
import LearnHome from './pages/app/LearnHome'
import Lesson from './pages/app/Lesson'
import LensPage from './pages/app/LensPage'
import SessionCheck from './pages/app/SessionCheck'
import Certificate from './pages/app/Certificate'
import Impact from './pages/app/Impact'

export default function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/app"
          element={
            <RequireRole>
              <PlatformShell />
            </RequireRole>
          }
        >
          <Route index element={<RoleHome />} />
          <Route
            path="lawyers"
            element={
              <RequireRole role="person">
                <LawyersDirectory />
              </RequireRole>
            }
          />
          <Route
            path="lawyers/:id"
            element={
              <RequireRole role="person">
                <LawyerProfile />
              </RequireRole>
            }
          />
          <Route path="sessions" element={<Sessions />} />
          <Route
            path="requests"
            element={
              <RequireRole role="lawyer">
                <Requests />
              </RequireRole>
            }
          />
          <Route
            path="availability"
            element={
              <RequireRole role="lawyer">
                <Availability />
              </RequireRole>
            }
          />
          <Route path="session/:id/check" element={<SessionCheck />} />
          <Route path="session/:id" element={<SessionRoom />} />
          <Route path="session/:id/record" element={<SessionRecord />} />
          <Route path="impact" element={<Impact />} />
          <Route path="learn" element={<LearnHome />} />
          <Route path="learn/certificate/:course" element={<Certificate />} />
          <Route path="learn/:course/:lesson" element={<Lesson />} />
          <Route path="lens" element={<LensPage />} />
          <Route path="lab" element={<Lab />} />
          <Route path="guide" element={<Guide />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        {/* جلسة الجهازين الحالية (غرف الخادم + QR) */}
        <Route element={<AppShell />}>
          <Route path="/pair" element={<PairJoin />} />
          <Route path="/screens" element={<ScreenPick />} />
          <Route path="/screen/lawyer" element={<Home lockedRole="lawyer" />} />
          <Route path="/screen/person" element={<Home lockedRole="person" />} />
        </Route>

        <Route path="/onboarding" element={<Navigate to="/login" replace />} />
        <Route path="/more" element={<Navigate to="/app" replace />} />
        <Route path="/lab" element={<Navigate to="/app/lab" replace />} />
        <Route path="/guide" element={<Navigate to="/app/guide" replace />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
        <Route path="/about" element={<Navigate to="/app/about" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SettingsProvider>
  )
}

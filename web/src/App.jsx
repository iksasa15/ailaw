import { Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider, useSettings } from './app/SettingsContext'
import Home from './pages/Home'
import Settings from './pages/Settings'
import About from './pages/About'
import Guide from './pages/Guide'
import Onboarding from './pages/Onboarding'
import ScreenPick from './pages/ScreenPick'

function Gate({ children }) {
  const { settings } = useSettings()
  if (!settings.onboarded) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/"
          element={
            <Gate>
              <Home />
            </Gate>
          }
        />
        <Route
          path="/screens"
          element={
            <Gate>
              <ScreenPick />
            </Gate>
          }
        />
        <Route
          path="/screen/lawyer"
          element={
            <Gate>
              <Home lockedRole="lawyer" />
            </Gate>
          }
        />
        <Route
          path="/screen/person"
          element={
            <Gate>
              <Home lockedRole="person" />
            </Gate>
          }
        />
        <Route
          path="/settings"
          element={
            <Gate>
              <Settings />
            </Gate>
          }
        />
        <Route
          path="/about"
          element={
            <Gate>
              <About />
            </Gate>
          }
        />
        <Route
          path="/guide"
          element={
            <Gate>
              <Guide />
            </Gate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SettingsProvider>
  )
}

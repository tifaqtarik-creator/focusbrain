import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useAppStore } from './stores/useStore';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import SoloSession from './pages/SoloSession';
import Profile from './pages/Profile';
import Circle from './pages/Circle';
import Community from './pages/Community';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import Donate from './pages/Donate';
import Onboarding from './pages/Onboarding';
import MonEspace from './pages/MonEspace';
import AdahAI from './modules/AdahAI';
import MusicPage from './pages/MusicPage';
import DayPlannerPage from './pages/DayPlannerPage';
import { PlannerProvider } from './context/PlannerContext';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import LiveSession from './pages/LiveSession';
import MapMembers from './pages/MapMembers';
import Layout from './components/layout/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore(s => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const lowStim = useAppStore(s => s.lowStimMode);

  return (
    <div className={lowStim ? 'low-stim' : ''}>
      {/* reducedMotion : Framer Motion suit le réglage système, ou s'arrête totalement en mode Low Stim */}
      <MotionConfig reducedMotion={lowStim ? 'always' : 'user'}>
      <PlannerProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          {/* Salle Live en plein écran (hors Layout = pas de barre de nav, immersif) */}
          <Route path="/live/:slotId" element={<PrivateRoute><LiveSession /></PrivateRoute>} />

          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/session/:id" element={<Session />} />
            <Route path="/map" element={<MapMembers />} />
            <Route path="/solo/:duration" element={<SoloSession />} />
            <Route path="/profile/me" element={<Profile />} />
            <Route path="/circle" element={<Circle />} />
            <Route path="/community" element={<Community />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/mon-espace" element={<MonEspace />} />
            <Route path="/adah" element={<AdahAI />} />
            <Route path="/music" element={<MusicPage />} />
            <Route path="/planner" element={<DayPlannerPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </PlannerProvider>
      </MotionConfig>
    </div>
  );
}

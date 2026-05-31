import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Layout from './components/layout/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore(s => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const lowStim = useAppStore(s => s.lowStimMode);

  return (
    <div className={lowStim ? 'low-stim' : ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />

          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/session/:id" element={<Session />} />
            <Route path="/solo/:duration" element={<SoloSession />} />
            <Route path="/profile/me" element={<Profile />} />
            <Route path="/circle" element={<Circle />} />
            <Route path="/community" element={<Community />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

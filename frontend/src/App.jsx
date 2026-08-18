import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import SquadMonitoring from './pages/SquadMonitoring';
import SoldierProfile from './pages/SoldierProfile';
import MissionMonitoring from './pages/MissionMonitoring';
import Analytics from './pages/Analytics';
import AIInsights from './pages/AIInsights';
import SimulationControl from './pages/SimulationControl';

export default function App() {
  const [user, setUser] = useState(null);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell user={user} onLogout={() => setUser(null)} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/squads" element={<SquadMonitoring />} />
          <Route path="/squads/:squadId" element={<SquadMonitoring />} />
          <Route path="/soldiers" element={<SquadMonitoring />} />
          <Route path="/soldiers/:soldierId" element={<SoldierProfile />} />
          <Route path="/missions" element={<MissionMonitoring />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/insights" element={<AIInsights />} />
          <Route path="/simulation" element={<SimulationControl />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

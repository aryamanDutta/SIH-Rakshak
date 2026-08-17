import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/client';

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',    icon: '⬡' },
  { to: '/squads',     label: 'Squad Monitor', icon: '◈' },
  { to: '/missions',   label: 'Missions',      icon: '◎' },
  { to: '/analytics',  label: 'Analytics',     icon: '∿' },
  { to: '/insights',   label: 'AI Insights',   icon: '✦' },
  { to: '/simulation', label: 'Simulation',    icon: '⟳' },
];

export default function AppShell({ user, onLogout }) {
  const [simRunning, setSimRunning] = useState(false);
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();

  // Refresh clock every second
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll simulation status
  useEffect(() => {
    const poll = async () => {
      try {
        const s = await api.simulation.status();
        setSimRunning(s.running ?? false);
      } catch (_) {}
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="topbar">
        <a className="topbar-logo" href="/dashboard">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <polygon points="20,2 36,12 36,28 20,38 4,28 4,12" fill="none" stroke="currentColor" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="4" fill="currentColor"/>
          </svg>
          RAKSHAK
        </a>
        <div className="topbar-spacer" />
        <div className="topbar-status">
          <span className={`risk-dot ${simRunning ? 'normal' : 'high'}`} />
          <span>{simRunning ? 'SIM ACTIVE' : 'SIM IDLE'}</span>
          <span style={{margin: '0 0.5rem', color: 'var(--border-lite)'}}>|</span>
          <span className="mono" style={{fontSize:'0.75rem'}}>{time.toLocaleTimeString()}</span>
          <span style={{margin: '0 0.5rem', color: 'var(--border-lite)'}}>|</span>
          <span style={{color:'var(--text-muted)', fontSize:'0.78rem'}}>{user.id}</span>
          <button
            className="btn"
            style={{marginLeft:'0.5rem', padding:'0.3rem 0.7rem', fontSize:'0.75rem'}}
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-section">Navigation</div>
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span style={{fontSize:'1rem', width:'1.1rem', textAlign:'center'}}>{icon}</span>
            {label}
          </NavLink>
        ))}
        <div className="divider" style={{marginTop:'auto'}} />
        <div className="sidebar-section" style={{marginTop: '0'}}>System</div>
        <div style={{padding:'0.5rem 0.75rem', fontSize:'0.72rem', color:'var(--text-muted)', lineHeight:1.5}}>
          <div>v0.1.0 prototype</div>
          <div>Not a clinical tool.</div>
        </div>
      </nav>

      {/* Main content */}
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

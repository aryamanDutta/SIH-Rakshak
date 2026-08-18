import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import api from '../api/client';
import { Settings as SettingsIcon, X, Check, Moon, Sun, RefreshCw, Volume2, Shield } from 'lucide-react';

export default function AppShell({ children, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [simStatus, setSimStatus] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);

  useEffect(() => {
    const checkSim = async () => {
      try {
        const s = await api.simulation.status();
        setSimStatus(s);
      } catch (_) {}
    };
    checkSim();
    const t = setInterval(checkSim, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        {/* Top Header */}
        <Header
          user={user}
          onLogout={onLogout}
          simRunning={simStatus?.running ?? false}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Scrollable Content View */}
        <main className="content-scrollable">
          {children || <Outlet />}
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="card" style={{ width: '440px', padding: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--navy-dark)' }}>
                <SettingsIcon size={20} color="var(--saffron)" />
                <span>RAKSHAK System Settings</span>
              </div>
              <button className="btn btn-icon" style={{ border: 'none', background: 'transparent' }} onClick={() => setShowSettings(false)}>
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Audio Alert Chimes</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Play sound on HIGH / CRITICAL alerts</div>
                </div>
                <input
                  type="checkbox"
                  checked={audioAlerts}
                  onChange={(e) => setAudioAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Auto-Refresh Interval</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dashboard polling frequency</div>
                </div>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value={3}>3 seconds</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--saffron-light)', border: '1px solid var(--saffron-border)', borderRadius: 'var(--r-md)', fontSize: '0.78rem', color: 'var(--navy-dark)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.2rem', color: 'var(--saffron)' }}>SIH Prototype Architecture Note</div>
                Currently operating in Software Simulation Mode (<code>SimulatorSource</code>). Real ESP32 hardware harness is integrated post-selection without redesigning core APIs.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowSettings(false)}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

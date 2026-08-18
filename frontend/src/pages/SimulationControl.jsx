import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Play, Square, RefreshCw, Cpu, Layers, Terminal } from 'lucide-react';
import api from '../api/client';

export default function SimulationControl() {
  const [status, setStatus] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [clientLog, setClientLog] = useState([]);

  const addClientLog = (msg, type = 'info') => {
    setClientLog((l) => [{ msg, type, t: new Date().toLocaleTimeString() }, ...l].slice(0, 20));
  };

  const refresh = useCallback(async () => {
    try {
      const [s, scList] = await Promise.all([
        api.simulation.status(),
        api.simulation.scenarios().catch(() => []),
      ]);
      setStatus(s);
      setScenarios(scList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleStart = async () => {
    setBusy(true);
    try {
      await api.simulation.start();
      addClientLog('Simulation started.', 'ok');
      await refresh();
    } catch (e) {
      addClientLog(`Error: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      await api.simulation.stop();
      addClientLog('Simulation stopped.', 'warn');
      await refresh();
    } catch (e) {
      addClientLog(`Error: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleScenarioChange = async (newScenario) => {
    setBusy(true);
    try {
      await api.simulation.setScenario(newScenario);
      addClientLog(`Scenario switched to ${newScenario}`, 'ok');
      await refresh();
    } catch (e) {
      addClientLog(`Scenario switch error: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTick = async () => {
    setBusy(true);
    try {
      const res = await api.simulation.tick();
      addClientLog(`Manual tick executed: ${res.message ?? 'done'}`, 'ok');
      await refresh();
    } catch (e) {
      addClientLog(`Tick error: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const running = status?.running ?? false;
  const currentScenario = status?.scenario || 'PATROL';
  const backendEvents = status?.events || [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Simulation &amp; Scenario Controller</h1>
          <p className="page-subtitle">Synthetic sensor telemetry engine &amp; hardware ingestion layer</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`status-dot ${running ? 'normal' : ''}`} style={{ background: running ? 'var(--ok)' : 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: running ? 'var(--ok)' : 'var(--text-muted)' }}>
            {running ? 'TELEMETRY STREAMING ACTIVE' : 'STREAM IDLE'}
          </span>
        </div>
      </div>

      {/* Data Source Architecture Card */}
      <div className="card" style={{ background: 'var(--navy-dark)', color: '#FFFFFF', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--saffron)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
          <Layers size={18} />
          <span>DATA SOURCE ARCHITECTURE — HARDWARE AGNOSTIC LAYER</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.82rem', marginTop: '0.6rem' }}>
          <div style={{ padding: '0.75rem', background: '#1E293B', borderRadius: 'var(--r-md)', border: '1px solid #334155' }}>
            <div style={{ fontWeight: 700, color: 'var(--saffron)', marginBottom: '0.2rem' }}>CURRENT: SimulatorSource</div>
            <div style={{ color: '#94A3B8', lineHeight: 1.5 }}>
              Generates correlated AR(1) physiological streams (RR intervals, skin temperature, 3-axis IMU accelerometer) for synthetic soldier validation.
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#1E293B', borderRadius: 'var(--r-md)', border: '1px solid #334155' }}>
            <div style={{ fontWeight: 700, color: 'var(--ok)', marginBottom: '0.2rem' }}>FUTURE: ESP32Source (Post-Selection)</div>
            <div style={{ color: '#94A3B8', lineHeight: 1.5 }}>
              Physical wearable harness (ECG, Temp, IMU, ESP32) drops into the <code>DataSource</code> interface without redesigning core baseline or fatigue APIs.
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /><span>Loading simulation engine…</span></div>
      ) : (
        <>
          {/* Status Metrics Grid */}
          <div className="stat-grid">
            <div className="stat-card-mini">
              <span className="label">Stream Status</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: running ? 'var(--ok)' : 'var(--text-muted)' }}>
                {running ? '● Running' : '○ Idle'}
              </div>
            </div>
            <div className="stat-card-mini">
              <span className="label">Active Scenario</span>
              <div className="text-saffron" style={{ fontSize: '1.3rem', fontWeight: 800 }}>{currentScenario}</div>
            </div>
            <div className="stat-card-mini">
              <span className="label">Monitored Personnel</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{status?.active_soldiers ?? 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Virtual soldiers</div>
            </div>
            <div className="stat-card-mini">
              <span className="label">Sampling Rate</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{status?.tick_rate_hz ?? 1} Hz</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1 sample / sec</div>
            </div>
            <div className="stat-card-mini">
              <span className="label">Total Readings</span>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{status?.total_readings ?? 0}</div>
            </div>
          </div>

          {/* Operational Controls & Scenario Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: '0.85rem' }}>Stream Controls</div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                <button className="btn btn-saffron" disabled={running || busy} onClick={handleStart}>
                  <Play size={16} />
                  <span>Start Stream</span>
                </button>
                <button className="btn btn-danger" disabled={!running || busy} onClick={handleStop}>
                  <Square size={16} />
                  <span>Stop Stream</span>
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Start simulation to initiate live 1 Hz sensor sampling across all soldiers.
              </p>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: '0.85rem' }}>Tactical Scenario Switcher</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['REST', 'PATROL', 'MODERATE_EXERTION', 'HIGH_INTENSITY', 'LONG_DURATION', 'RECOVERY'].map((sc) => (
                  <button
                    key={sc}
                    className={`btn btn-sm ${currentScenario === sc ? 'btn-saffron' : ''}`}
                    disabled={!running || busy}
                    onClick={() => handleScenarioChange(sc)}
                  >
                    {sc}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.4 }}>
                Switching scenarios dynamically alters heart rate, HRV, and skin temperature drift parameters over time.
              </p>
            </div>
          </div>

          {/* Real Application Activity Event Log */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div className="card-title">Real Application Activity Event Log</div>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Backend Stream Events</span>
            </div>
            {backendEvents.length === 0 ? (
              <div className="state-center" style={{ padding: '1.5rem' }}>
                No events logged yet. Click "Start Stream" above.
              </div>
            ) : (
              <div className="mono" style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '240px', overflowY: 'auto' }}>
                {backendEvents.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.85rem', color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '75px' }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{ color: entry.type === 'warn' ? 'var(--high)' : entry.type === 'error' ? 'var(--critical)' : 'var(--navy-dark)' }}>
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Developer / Debug Controls Section */}
          <div className="card" style={{ background: 'var(--bg-main)' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
              Developer / Debug Controls
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-sm" disabled={running || busy} onClick={handleTick}>
                <RefreshCw size={14} />
                <span>Execute Single Manual Tick</span>
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Generates a single discrete telemetry tick for manual debugging without starting continuous async loop.
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
}

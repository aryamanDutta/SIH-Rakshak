import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';

export default function SimulationControl() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg, type = 'info') => {
    setLog(l => [{ msg, type, t: new Date().toLocaleTimeString() }, ...l].slice(0, 50));
  };

  const refresh = useCallback(async () => {
    try {
      const s = await api.simulation.status();
      setStatus(s);
    } catch (e) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleStart = async () => {
    setBusy(true);
    try {
      await api.simulation.start();
      addLog('Simulation started.', 'ok');
      await refresh();
    } catch (e) {
      addLog(`Error: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      await api.simulation.stop();
      addLog('Simulation stopped.', 'warn');
      await refresh();
    } catch (e) {
      addLog(`Error: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTick = async () => {
    setBusy(true);
    try {
      const res = await api.simulation.tick();
      addLog(`Manual tick: ${res.message ?? 'done'}`, 'ok');
      await refresh();
    } catch (e) {
      addLog(`Tick error: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const running = status?.running ?? false;
  const logColor = { ok: 'var(--ok)', warn: 'var(--elevated)', error: 'var(--critical)', info: 'var(--text-secondary)' };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Simulation Control</h1>
        <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <span className={`risk-dot ${running ? 'normal' : 'high'}`} />
          <span style={{fontSize:'0.82rem', color: running ? 'var(--ok)' : 'var(--high)'}}>
            {running ? 'RUNNING' : 'IDLE'}
          </span>
        </div>
      </div>

      <div className="card" style={{
        fontSize:'0.8rem', color:'var(--accent)', lineHeight:1.5,
        background:'var(--accent-glow)', border:'1px solid var(--accent-dim)'
      }}>
        ℹ This is a software simulator replacing future ESP32 hardware. Sensor data (RR intervals, temperature, 
        accelerometer) is generated using AR(1) correlated models to simulate realistic physiological signals. 
        The DataSource interface is hardware-agnostic — swap SimulatorSource for ESP32Source when hardware is ready.
      </div>

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /></div>
      ) : (
        <>
          {/* Status cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Status</div>
              <div className="stat-value" style={{fontSize:'1.2rem', color: running ? 'var(--ok)' : 'var(--text-muted)'}}>
                {running ? '● Running' : '○ Idle'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Soldiers</div>
              <div className="stat-value">{status?.active_soldiers ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tick Rate</div>
              <div className="stat-value" style={{fontSize:'1.2rem'}}>{status?.tick_rate_hz ?? 1} Hz</div>
              <div className="stat-sub">readings / second / soldier</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Readings</div>
              <div className="stat-value mono">{status?.total_readings ?? 0}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="card">
            <div style={{fontWeight:600, marginBottom:'1rem'}}>Controls</div>
            <div style={{display:'flex', gap:'0.75rem', flexWrap:'wrap'}}>
              <button
                className="btn btn-accent"
                disabled={running || busy}
                onClick={handleStart}
              >
                ▶ Start Simulation
              </button>
              <button
                className="btn btn-danger"
                disabled={!running || busy}
                onClick={handleStop}
              >
                ■ Stop Simulation
              </button>
              <button
                className="btn"
                disabled={running || busy}
                onClick={handleTick}
                title="Generate one tick of data for all soldiers without running the loop"
              >
                ⟳ Manual Tick
              </button>
            </div>
            <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.75rem', lineHeight:1.6}}>
              Start simulation to continuously generate sensor readings for all soldiers. 
              Use Manual Tick for single-step debugging. Stop when finished.
            </p>
          </div>

          {/* Data source info */}
          <div className="card">
            <div style={{fontWeight:600, marginBottom:'0.75rem'}}>Data Source Architecture</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div style={{padding:'0.75rem', background:'var(--bg-surface)', borderRadius:'var(--r-md)', border:'1px solid var(--border)'}}>
                <div style={{fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--accent)', fontWeight:600, marginBottom:'0.4rem'}}>
                  ✓ CURRENT — SimulatorSource
                </div>
                <div style={{fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.6}}>
                  AR(1) correlated RR-interval streams. Simulates ECG, temperature, IMU.
                  Realistic physiological patterns with fatigue scenarios.
                </div>
              </div>
              <div style={{padding:'0.75rem', background:'var(--bg-surface)', borderRadius:'var(--r-md)', border:'1px solid var(--border)', opacity:0.5}}>
                <div style={{fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', fontWeight:600, marginBottom:'0.4rem'}}>
                  FUTURE — ESP32Source
                </div>
                <div style={{fontSize:'0.82rem', color:'var(--text-muted)', lineHeight:1.6}}>
                  Same DataSource interface. Reads from wearable harness over serial/BLE.
                  Hardware integration after SIH selection.
                </div>
              </div>
            </div>
          </div>

          {/* Activity log */}
          <div className="card">
            <div style={{fontWeight:600, marginBottom:'0.75rem'}}>Activity Log</div>
            {log.length === 0 ? (
              <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>No activity yet. Use controls above.</div>
            ) : (
              <div style={{fontFamily:'var(--font-mono)', fontSize:'0.78rem', display:'flex', flexDirection:'column', gap:'0.25rem', maxHeight:'200px', overflowY:'auto'}}>
                {log.map((entry, i) => (
                  <div key={i} style={{display:'flex', gap:'1rem', color: logColor[entry.type]}}>
                    <span style={{color:'var(--text-muted)', minWidth:'70px'}}>{entry.t}</span>
                    <span>{entry.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

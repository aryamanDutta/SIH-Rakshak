import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Heart, Thermometer, Activity, ShieldCheck, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

export default function SoldierProfile() {
  const { soldierId } = useParams();
  const navigate = useNavigate();
  const [soldier, setSoldier] = useState(null);
  const [fatigue, setFatigue] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [readings, setReadings] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!soldierId) return;
    try {
      const [s, f, bl, rList, hist, al] = await Promise.all([
        api.soldiers.get(soldierId),
        api.soldiers.fatigue(soldierId).catch(() => null),
        api.soldiers.baseline(soldierId).catch(() => null),
        api.soldiers.readings(soldierId, 10).catch(() => []),
        api.analytics.soldierHistory(soldierId, 2).catch(() => ({ history: [] })),
        api.soldiers.alerts(soldierId).catch(() => []),
      ]);
      setSoldier(s);
      setFatigue(f);
      setBaseline(bl);
      setReadings(rList);
      setHistory(hist?.history ?? []);
      setAlerts(al);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [soldierId]);

  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  const latestR = readings[0] || soldier?.latest_reading || null;
  const cat = fatigue?.risk_category ?? 'NORMAL';

  // Personalized Baseline Comparison Math
  const currentHr = latestR?.mean_hr ?? (latestR?.rr_interval_ms ? 60000.0 / latestR.rr_interval_ms : null);
  const baseHr = baseline?.baseline_hr_mean ?? 72.0;
  const hrDevPct = currentHr ? ((currentHr - baseHr) / baseHr) * 100.0 : 0.0;

  const currentHrv = latestR?.rmssd ?? null;
  const baseHrv = baseline?.baseline_hrv_mean ?? 35.0;
  const hrvDevPct = currentHrv ? ((currentHrv - baseHrv) / baseHrv) * 100.0 : 0.0;

  const currentTemp = latestR?.temperature_c ?? latestR?.temperature ?? null;
  const baseTemp = baseline?.baseline_temp_mean ?? 36.8;
  const tempDevPct = currentTemp ? ((currentTemp - baseTemp) / baseTemp) * 100.0 : 0.0;

  const chartData = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fatigue: h.fatigue_score ? parseFloat(h.fatigue_score.toFixed(1)) : 0,
    hr: h.mean_hr ? Math.round(h.mean_hr) : null,
    rmssd: h.rmssd ? parseFloat(h.rmssd.toFixed(1)) : null,
  }));

  if (loading) return <div className="state-center"><div className="spinner-ring" /><span>Loading soldier profile…</span></div>;
  if (!soldier) return <div className="state-center">Soldier record not found.</div>;

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button className="btn btn-icon" onClick={() => navigate(-1)} title="Back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 className="page-title">{soldier.name}</h1>
              <RiskBadge level={cat} />
            </div>
            <p className="page-subtitle">{soldier.rank} · {soldier.call_sign} · Squad ID #{soldier.squad_id}</p>
          </div>
        </div>
        <div className="mono text-saffron" style={{ fontSize: '1rem', fontWeight: 800 }}>
          {soldier.soldier_uid}
        </div>
      </div>

      {/* Identity Cards Grid */}
      <div className="stat-grid">
        <div className="stat-card-mini">
          <span className="label">Call Sign</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{soldier.call_sign}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tactical ID</div>
        </div>
        <div className="stat-card-mini">
          <span className="label">Rank / Role</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{soldier.rank}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Infantry Unit</div>
        </div>
        <div className="stat-card-mini">
          <span className="label">Biometrics</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy-dark)' }}>
            {soldier.age} yrs · {soldier.weight_kg} kg
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Height: {soldier.height_cm} cm</div>
        </div>
        <div className="stat-card-mini">
          <span className="label">Baseline Calibration</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: baseline?.is_valid ? 'var(--ok)' : 'var(--saffron)' }}>
            {baseline?.is_valid ? '✓ Calibrated' : `Calibrating (${baseline?.sample_count ?? 0}/30)`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EMA Baseline Engine</div>
        </div>
      </div>

      {/* Current Real-Time Physiological Telemetry */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div className="card-title">Real-Time Physiological Telemetry</div>
            <div className="card-subtitle">Live stream metrics from sensor data window</div>
          </div>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Source: {latestR?.source || 'Simulator'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heart Rate</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.2rem' }}>
              {currentHr ? `${currentHr.toFixed(0)}` : '—'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>BPM</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>RR: {latestR?.rr_interval_ms?.toFixed(1) ?? '—'} ms</div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body Temp</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.2rem' }}>
              {currentTemp ? `${currentTemp.toFixed(1)}` : '—'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>°C</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Skin temperature</div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RMSSD (HRV)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ok)', marginTop: '0.2rem' }}>
              {latestR?.rmssd != null ? `${latestR.rmssd.toFixed(1)}` : '—'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ms</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ok)', marginTop: '0.25rem', fontWeight: 600 }}>Parasympathetic tone</div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SDNN (HRV)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.2rem' }}>
              {latestR?.sdnn != null ? `${latestR.sdnn.toFixed(1)}` : '—'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ms</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Overall variation</div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>pNN50</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.2rem' }}>
              {latestR?.pnn50 != null ? `${latestR.pnn50.toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>&gt;50ms diffs</div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.3rem', textTransform: 'uppercase' }}>
              {latestR?.activity_label || 'PATROL'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Intensity: {latestR?.activity_intensity != null ? (latestR.activity_intensity * 100).toFixed(0) + '%' : '—'}</div>
          </div>
        </div>
      </div>

      {/* Personalized Baseline Comparison */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '0.85rem' }}>Personalized Baseline Comparison</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Heart Rate Shift
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem', color: hrDevPct > 15 ? 'var(--high)' : 'var(--navy-dark)' }}>
              {currentHr ? currentHr.toFixed(0) : '—'} BPM
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.4rem' }}>
                (Base: {baseHr.toFixed(0)} BPM)
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.3rem', color: hrDevPct > 0 ? 'var(--high)' : 'var(--ok)', fontWeight: 700 }}>
              {hrDevPct >= 0 ? `+${hrDevPct.toFixed(1)}% vs baseline` : `${hrDevPct.toFixed(1)}% vs baseline`}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              HRV (RMSSD) Shift
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem', color: hrvDevPct < -20 ? 'var(--critical)' : 'var(--ok)' }}>
              {currentHrv != null ? `${currentHrv.toFixed(1)} ms` : '—'}
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.4rem' }}>
                (Base: {baseHrv.toFixed(1)} ms)
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.3rem', color: hrvDevPct < 0 ? 'var(--critical)' : 'var(--ok)', fontWeight: 700 }}>
              {currentHrv != null ? (hrvDevPct >= 0 ? `+${hrvDevPct.toFixed(1)}% vs baseline` : `${hrvDevPct.toFixed(1)}% vs baseline`) : 'Collecting baseline'}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Temperature Shift
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem', color: tempDevPct > 2 ? 'var(--high)' : 'var(--navy-dark)' }}>
              {currentTemp ? `${currentTemp.toFixed(1)} °C` : '—'}
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.4rem' }}>
                (Base: {baseTemp.toFixed(1)} °C)
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.3rem', color: tempDevPct > 1 ? 'var(--high)' : 'var(--ok)', fontWeight: 700 }}>
              {tempDevPct >= 0 ? `+${tempDevPct.toFixed(1)}% vs baseline` : `${tempDevPct.toFixed(1)}% vs baseline`}
            </div>
          </div>
        </div>
      </div>

      {/* Fatigue Contributors Breakdown */}
      {fatigue && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="card-title">Heuristic Fatigue Assessment Breakdown</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model: {fatigue.model_version || 'heuristic-v1'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="stat-card-mini" style={{ background: 'var(--bg-main)' }}>
              <span className="label">Fatigue Score</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: cat === 'CRITICAL' ? 'var(--critical)' : cat === 'HIGH' ? 'var(--high)' : cat === 'ELEVATED' ? 'var(--elevated)' : 'var(--ok)' }}>
                {fatigue.fatigue_score?.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</div>
            </div>

            {fatigue.contributors &&
              Object.entries(fatigue.contributors).map(([k, v]) => (
                <div key={k} style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {k.replace('_', ' ')}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy-dark)', marginTop: '0.2rem' }}>
                    {(v * 100).toFixed(0)}%
                  </div>
                  <div style={{ height: '5px', borderRadius: '3px', background: 'var(--border)', marginTop: '0.4rem', overflow: 'hidden' }}>
                    <div style={{ width: `${v * 100}%`, height: '100%', background: 'var(--saffron)', borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Historical Trend Charts */}
      {chartData.length > 1 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Physiological &amp; Fatigue History</div>
          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="fatigue" stroke="#DC2626" fillOpacity={0.1} fill="#DC2626" name="Fatigue Score" strokeWidth={2} />
                <Area type="monotone" dataKey="hr" stroke="#FF9933" fillOpacity={0.1} fill="#FF9933" name="Heart Rate (BPM)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}

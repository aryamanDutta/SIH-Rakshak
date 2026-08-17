import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

export default function SoldierProfile() {
  const { soldierId } = useParams();
  const navigate = useNavigate();
  const [soldier, setSoldier] = useState(null);
  const [fatigue, setFatigue] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!soldierId) return;
    try {
      const [s, f, hist, al] = await Promise.all([
        api.soldiers.get(soldierId),
        api.soldiers.fatigue(soldierId).catch(() => null),
        api.analytics.soldierHistory(soldierId, 2).catch(() => ({ history: [] })),
        api.soldiers.alerts(soldierId).catch(() => []),
      ]);
      setSoldier(s);
      setFatigue(f);
      setHistory(hist?.history ?? []);
      setAlerts(al.slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [soldierId]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const chartData = history.map((h) => ({
    t: new Date(h.timestamp).toLocaleTimeString(),
    fatigue: h.fatigue_score?.toFixed(1),
    hr: h.mean_hr?.toFixed(0),
    rmssd: h.rmssd?.toFixed(1),
  }));

  if (loading) return <div className="state-center"><div className="spinner-ring" /><span>Loading profile…</span></div>;
  if (!soldier) return <div className="state-center">Soldier not found.</div>;

  const cat = fatigue?.risk_category ?? 'NORMAL';

  return (
    <>
      <div className="page-header">
        <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
          <button className="btn" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="page-title">{soldier.name}</h1>
          <RiskBadge level={cat} />
        </div>
        <div className="mono text-accent" style={{fontSize:'0.9rem'}}>{soldier.soldier_uid}</div>
      </div>

      {/* Bio row */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'0.75rem'}}>
        {[
          { label: 'Call Sign', value: soldier.call_sign },
          { label: 'Rank', value: soldier.rank },
          { label: 'Age', value: soldier.age },
          { label: 'Weight', value: `${soldier.weight_kg} kg` },
          { label: 'Height', value: `${soldier.height_cm} cm` },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div style={{fontWeight:600, marginTop:'0.25rem'}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Current fatigue */}
      {fatigue && (
        <div className="card">
          <div style={{fontWeight:600, marginBottom:'1rem'}}>Current Fatigue Assessment</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'0.75rem'}}>
            <div className="stat-card">
              <div className="stat-label">Fatigue Score</div>
              <div className="stat-value" style={{
                color: cat === 'CRITICAL' ? 'var(--critical)' : cat === 'HIGH' ? 'var(--high)' :
                       cat === 'ELEVATED' ? 'var(--elevated)' : 'var(--ok)'
              }}>
                {fatigue.fatigue_score?.toFixed(1)}
              </div>
              <div className="stat-sub">/ 100</div>
            </div>
            {fatigue.contributors && Object.entries(fatigue.contributors).map(([k, v]) => (
              <div key={k} className="stat-card">
                <div className="stat-label">{k.replace('_', ' ')}</div>
                <div style={{fontWeight:600, fontSize:'1.1rem', marginTop:'0.3rem'}}>
                  {(v * 100).toFixed(0)}%
                </div>
                <div style={{
                  height:'4px', borderRadius:'2px',
                  background:'var(--border)', marginTop:'0.4rem', overflow:'hidden'
                }}>
                  <div style={{
                    width:`${v*100}%`, height:'100%',
                    background:'var(--accent)', borderRadius:'2px'
                  }} />
                </div>
              </div>
            ))}
          </div>
          {!fatigue.baseline_valid && (
            <div style={{
              marginTop:'0.75rem', padding:'0.5rem 0.75rem',
              background:'var(--elevated-dim)', border:'1px solid var(--elevated)',
              borderRadius:'var(--r-sm)', fontSize:'0.78rem', color:'var(--elevated)'
            }}>
              ⚠ Personal baseline not yet established (need ≥30 samples). Scores use population defaults.
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="card">
          <div style={{fontWeight:600, marginBottom:'1rem'}}>Fatigue Score — Last 2 hours</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{fill:'var(--text-muted)', fontSize:11}} interval="preserveStartEnd" />
                <YAxis domain={[0,100]} tick={{fill:'var(--text-muted)', fontSize:11}} />
                <Tooltip
                  contentStyle={{background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)'}}
                  labelStyle={{color:'var(--text-secondary)'}}
                />
                <Legend wrapperStyle={{fontSize:12, color:'var(--text-secondary)'}} />
                <Line type="monotone" dataKey="fatigue" stroke="var(--critical)" dot={false} name="Fatigue Score" strokeWidth={2} />
                <Line type="monotone" dataKey="hr" stroke="var(--accent)" dot={false} name="HR (bpm)" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="card">
        <div style={{fontWeight:600, marginBottom:'0.75rem'}}>Alert History</div>
        {alerts.length === 0 ? (
          <div className="state-center" style={{padding:'1rem'}}>
            <span className="text-ok">✓</span> No alerts for this soldier
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
            {alerts.map((a) => (
              <div key={a.id} style={{
                display:'flex', alignItems:'flex-start', gap:'0.75rem',
                padding:'0.6rem 0.8rem', borderRadius:'var(--r-md)',
                background:'var(--bg-surface)', border:'1px solid var(--border)',
                opacity: a.is_acknowledged ? 0.5 : 1
              }}>
                <RiskBadge level={a.severity?.toLowerCase()} />
                <div style={{flex:1}}>
                  <div style={{fontSize:'0.82rem', fontWeight:500}}>{a.message}</div>
                  <div style={{fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.2rem', fontFamily:'var(--font-mono)'}}>
                    {new Date(a.timestamp).toLocaleString()}
                    {a.is_acknowledged && ' · Acknowledged'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [squads, setSquads] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [summ, sq, sol] = await Promise.all([
        api.analytics.systemSummary().catch(() => null),
        api.squads.list().catch(() => []),
        api.soldiers.list().catch(() => []),
      ]);
      setSummary(summ);
      setSquads(sq);
      // Fetch recent alerts from first 3 soldiers
      const soldierAlerts = await Promise.all(
        sol.slice(0, 6).map((s) => api.soldiers.alerts(s.id).catch(() => []))
      );
      const all = soldierAlerts.flat().sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      setAlerts(all.slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return (
    <div className="state-center">
      <div className="spinner-ring" />
      <span>Loading RAKSHAK data…</span>
    </div>
  );

  const totalSoldiers = squads.reduce((a, s) => a + (s.soldier_count ?? 0), 0);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Operational Dashboard</h1>
        <span className="text-muted" style={{fontSize:'0.8rem'}}>
          Auto-refreshes every 10s
        </span>
      </div>

      {/* Summary stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Squads</div>
          <div className="stat-value text-accent">{squads.length}</div>
          <div className="stat-sub">Active units</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Soldiers</div>
          <div className="stat-value">{summary?.total_soldiers ?? totalSoldiers}</div>
          <div className="stat-sub">Monitored personnel</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Alerts</div>
          <div className="stat-value text-crit">{alerts.filter(a => !a.is_acknowledged).length}</div>
          <div className="stat-sub">Unacknowledged</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical Risk</div>
          <div className="stat-value text-crit">{summary?.critical_count ?? 0}</div>
          <div className="stat-sub">Soldiers</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High Risk</div>
          <div className="stat-value text-high">{summary?.high_count ?? 0}</div>
          <div className="stat-sub">Soldiers</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Normal Status</div>
          <div className="stat-value text-ok">{summary?.normal_count ?? 0}</div>
          <div className="stat-sub">Soldiers</div>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', alignItems:'start'}}>
        {/* Squads overview */}
        <div className="card">
          <div style={{fontWeight:600, marginBottom:'1rem'}}>Squad Overview</div>
          {squads.length === 0 ? (
            <div className="state-center" style={{padding:'1.5rem'}}>No squads found. Run seed_data.py first.</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'0.6rem'}}>
              {squads.map((sq) => (
                <div
                  key={sq.id}
                  className="card"
                  style={{cursor:'pointer', padding:'0.75rem 1rem', background:'var(--bg-surface)'}}
                  onClick={() => navigate(`/squads/${sq.id}`)}
                >
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontWeight:600}}>{sq.name}</div>
                      <div style={{fontSize:'0.78rem', color:'var(--text-muted)'}}>{sq.unit}</div>
                    </div>
                    <div style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>
                      {sq.soldier_count ?? '—'} soldiers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent alerts */}
        <div className="card">
          <div style={{fontWeight:600, marginBottom:'1rem'}}>Recent Alerts</div>
          {alerts.length === 0 ? (
            <div className="state-center" style={{padding:'1.5rem'}}>
              <span className="text-ok">✓</span> No active alerts
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
              {alerts.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding:'0.6rem 0.8rem',
                    borderRadius:'var(--r-md)',
                    background:'var(--bg-surface)',
                    border:`1px solid var(--border)`,
                    opacity: a.is_acknowledged ? 0.5 : 1,
                  }}
                >
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem'}}>
                    <RiskBadge level={a.severity?.toLowerCase()} />
                    <span style={{fontSize:'0.7rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{fontSize:'0.8rem', marginTop:'0.35rem', color:'var(--text-secondary)'}}>
                    {a.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{fontSize:'0.75rem', color:'var(--text-muted)', lineHeight:1.6}}>
        ⚠ DISCLAIMER: RAKSHAK is a software prototype for the SIH internal round. 
        All fatigue assessments are heuristic estimates derived from simulated sensor data. 
        This is NOT a clinically validated diagnostic or medical tool.
      </div>
    </>
  );
}

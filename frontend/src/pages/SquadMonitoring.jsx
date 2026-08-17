import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

export default function SquadMonitoring() {
  const { squadId } = useParams();
  const navigate = useNavigate();
  const [squads, setSquads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSquads = useCallback(async () => {
    const sq = await api.squads.list().catch(() => []);
    setSquads(sq);
    if (sq.length && !selected) setSelected(squadId ? parseInt(squadId) : sq[0].id);
  }, [squadId]);

  const loadStatus = useCallback(async (id) => {
    if (!id) return;
    try {
      const s = await api.squads.status(id);
      setStatus(s);
    } catch (e) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSquads(); }, [loadSquads]);
  useEffect(() => { if (selected) loadStatus(selected); }, [selected, loadStatus]);

  useEffect(() => {
    const t = setInterval(() => { if (selected) loadStatus(selected); }, 8000);
    return () => clearInterval(t);
  }, [selected, loadStatus]);

  const riskColor = (cat) => {
    const m = { NORMAL:'var(--ok)', ELEVATED:'var(--elevated)', HIGH:'var(--high)', CRITICAL:'var(--critical)' };
    return m[cat] ?? 'var(--text-secondary)';
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Squad Monitoring</h1>
        <div style={{display:'flex', gap:'0.5rem'}}>
          {squads.map((sq) => (
            <button
              key={sq.id}
              className={`btn ${selected === sq.id ? 'btn-accent' : ''}`}
              onClick={() => { setSelected(sq.id); setLoading(true); }}
            >
              {sq.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /><span>Loading squad data…</span></div>
      ) : !status ? (
        <div className="state-center">No squad data. Run seed_data.py and start simulation.</div>
      ) : (
        <>
          {/* Squad summary row */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Squad</div>
              <div className="stat-value" style={{fontSize:'1.3rem'}}>{status.squad_name}</div>
              <div className="stat-sub">{status.total_soldiers} soldiers</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Fatigue</div>
              <div className="stat-value" style={{color: riskColor(
                status.avg_fatigue_score > 70 ? 'CRITICAL' :
                status.avg_fatigue_score > 50 ? 'HIGH' :
                status.avg_fatigue_score > 30 ? 'ELEVATED' : 'NORMAL'
              )}}>
                {status.avg_fatigue_score?.toFixed(1) ?? '—'}
              </div>
              <div className="stat-sub">/ 100</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Alerts</div>
              <div className="stat-value text-crit">{status.active_alert_count}</div>
            </div>
            {Object.entries(status.risk_distribution ?? {}).map(([k, v]) => (
              <div className="stat-card" key={k}>
                <div className="stat-label">{k}</div>
                <div className="stat-value" style={{fontSize:'1.4rem', color: riskColor(k)}}>{v}</div>
                <div className="stat-sub">soldiers</div>
              </div>
            ))}
          </div>

          {/* Soldiers table */}
          <div className="card" style={{padding:0}}>
            <div style={{padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)', fontWeight:600}}>
              Personnel — {status.squad_name}
            </div>
            <div className="table-wrap" style={{border:'none', borderRadius:0}}>
              <table>
                <thead>
                  <tr>
                    <th>UID</th>
                    <th>Name</th>
                    <th>Call Sign</th>
                    <th>Rank</th>
                    <th>Risk</th>
                    <th>Fatigue</th>
                    <th>HR (bpm)</th>
                    <th>Temp (°C)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(status.soldiers ?? []).map((sol) => {
                    const fa = sol.latest_fatigue;
                    const lr = sol.latest_reading;
                    const cat = fa?.risk_category ?? 'NORMAL';
                    return (
                      <tr key={sol.id} onClick={() => navigate(`/soldiers/${sol.id}`)}>
                        <td className="mono text-accent" style={{fontSize:'0.8rem'}}>{sol.soldier_uid}</td>
                        <td style={{fontWeight:500}}>{sol.name}</td>
                        <td className="mono" style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{sol.call_sign}</td>
                        <td style={{fontSize:'0.82rem'}}>{sol.rank}</td>
                        <td><RiskBadge level={cat} /></td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                            <div style={{
                              width:'60px', height:'5px', borderRadius:'3px',
                              background:'var(--border)', overflow:'hidden'
                            }}>
                              <div style={{
                                width: `${fa?.fatigue_score ?? 0}%`,
                                height:'100%',
                                background: riskColor(cat),
                                borderRadius:'3px',
                                transition:'width 0.5s ease'
                              }} />
                            </div>
                            <span style={{fontSize:'0.82rem', fontFamily:'var(--font-mono)'}}>
                              {fa?.fatigue_score?.toFixed(0) ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="mono" style={{fontSize:'0.82rem'}}>
                          {lr ? Math.round(60000 / lr.rr_interval_ms) : '—'}
                        </td>
                        <td className="mono" style={{fontSize:'0.82rem'}}>
                          {lr?.temperature_c?.toFixed(1) ?? '—'}
                        </td>
                        <td>
                          <button
                            className="btn"
                            style={{padding:'0.25rem 0.6rem', fontSize:'0.75rem'}}
                            onClick={(e) => { e.stopPropagation(); navigate(`/soldiers/${sol.id}`); }}
                          >
                            Profile →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

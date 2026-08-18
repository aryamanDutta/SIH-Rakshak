import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Activity, AlertTriangle, ArrowUpDown, ChevronRight, User } from 'lucide-react';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

export default function SquadMonitoring() {
  const { squadId } = useParams();
  const navigate = useNavigate();
  const [squads, setSquads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('fatigue_score');
  const [sortAsc, setSortAsc] = useState(false);
  const prevCategories = useRef({});

  const loadSquads = useCallback(async () => {
    const sq = await api.squads.list().catch(() => []);
    setSquads(sq);
    if (sq.length && !selected) setSelected(squadId ? parseInt(squadId) : sq[0].id);
  }, [squadId, selected]);

  const loadStatus = useCallback(async (id) => {
    if (!id) return;
    try {
      const s = await api.squads.status(id);
      setStatus(s);
    } catch (e) {
      console.error(e);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSquads(); }, [loadSquads]);
  useEffect(() => { if (selected) loadStatus(selected); }, [selected, loadStatus]);

  useEffect(() => {
    const t = setInterval(() => { if (selected) loadStatus(selected); }, 4000);
    return () => clearInterval(t);
  }, [selected, loadStatus]);

  const riskColor = (cat) => {
    const m = { NORMAL: '#16A34A', ELEVATED: '#F59E0B', HIGH: '#EA580C', CRITICAL: '#DC2626' };
    return m[cat] ?? '#475569';
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedSoldiers = [...(status?.soldiers ?? [])].sort((a, b) => {
    let valA = a[sortField] ?? 0;
    let valB = b[sortField] ?? 0;
    if (sortField === 'risk_category') {
      const order = { NORMAL: 1, ELEVATED: 2, HIGH: 3, CRITICAL: 4 };
      valA = order[valA] ?? 0;
      valB = order[valB] ?? 0;
    }
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Squad Health &amp; Fatigue Monitor</h1>
          <p className="page-subtitle">Real-time tactical roster &amp; individual fatigue risk scoring</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {squads.map((sq) => (
            <button
              key={sq.id}
              className={`btn ${selected === sq.id ? 'btn-primary' : ''}`}
              onClick={() => { setSelected(sq.id); setLoading(true); }}
            >
              {sq.name} ({sq.soldier_count ?? 5})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /><span>Loading squad telemetry…</span></div>
      ) : !status ? (
        <div className="state-center">No squad telemetry available. Ensure backend is running.</div>
      ) : (
        <>
          {/* Squad Summary Metric Cards */}
          <div className="stat-grid">
            <div className="stat-card-mini">
              <span className="label">Squad Unit</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{status.squad_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{status.total_soldiers} personnel</div>
            </div>

            <div className="stat-card-mini">
              <span className="label">Avg Fatigue Score</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: riskColor(status.avg_fatigue_score >= 55 ? 'HIGH' : status.avg_fatigue_score >= 30 ? 'ELEVATED' : 'NORMAL') }}>
                {status.avg_fatigue_score?.toFixed(1) ?? '0.0'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scale 0–100</div>
            </div>

            <div className="stat-card-mini">
              <span className="label">Active Alerts</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: status.active_alert_count > 0 ? 'var(--critical)' : 'var(--navy-dark)' }}>
                {status.active_alert_count}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unacknowledged</div>
            </div>

            {['NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL'].map((cat) => {
              const count = status.risk_distribution?.[cat] ?? 0;
              return (
                <div className="stat-card-mini" key={cat}>
                  <span className="label">{cat} Risk</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: riskColor(cat) }}>{count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>soldiers</div>
                </div>
              );
            })}
          </div>

          {/* Personnel Roster Table */}
          <div className="table-container">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy-dark)' }}>Personnel Roster — {status.squad_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click any column header to sort · Click row to view personal profile</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--ok)', fontWeight: 600 }}>● 1 Hz Telemetry</span>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Name</th>
                  <th>Call Sign</th>
                  <th>Rank</th>
                  <th onClick={() => handleSort('risk_category')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Risk</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('fatigue_score')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Fatigue</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('mean_hr')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Heart Rate</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('temperature')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Temp (°C)</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedSoldiers.map((sol) => {
                  const fa = sol.latest_fatigue;
                  const cat = sol.risk_category || fa?.risk_category || 'NORMAL';
                  const prevCat = prevCategories.current[sol.soldier_id];
                  const changed = prevCat && prevCat !== cat;
                  prevCategories.current[sol.soldier_id] = cat;

                  return (
                    <tr
                      key={sol.soldier_id}
                      onClick={() => navigate(`/soldiers/${sol.soldier_id}`)}
                      style={{
                        borderLeft: changed ? `4px solid ${riskColor(cat)}` : '4px solid transparent',
                      }}
                    >
                      <td className="mono text-saffron" style={{ fontWeight: 700 }}>{sol.soldier_uid}</td>
                      <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>{sol.name}</td>
                      <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{sol.call_sign}</td>
                      <td>{sol.rank}</td>
                      <td>
                        <RiskBadge level={cat} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '70px', height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, sol.fatigue_score ?? 0))}%`,
                                height: '100%',
                                background: riskColor(cat),
                                borderRadius: '3px',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                          <span className="mono" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {(sol.fatigue_score ?? 0).toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {sol.mean_hr != null ? `${sol.mean_hr.toFixed(0)} BPM` : '—'}
                      </td>
                      <td className="mono">
                        {sol.temperature != null ? `${sol.temperature.toFixed(1)} °C` : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/soldiers/${sol.soldier_id}`); }}
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
        </>
      )}
    </>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Heart, Thermometer, Activity, AlertTriangle,
  Search, Filter, LayoutGrid, List as ListIcon, ChevronRight, Shield
} from 'lucide-react';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

export default function SoldiersList() {
  const navigate = useNavigate();
  const [soldiers, setSoldiers] = useState([]);
  const [squads, setSquads] = useState([]);
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [squadFilter, setSquadFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const loadData = useCallback(async () => {
    try {
      const [sqList, st] = await Promise.all([
        api.squads.list().catch(() => []),
        api.squads.status(0).catch(() => null),
      ]);
      setSquads(sqList);
      setStatusData(st);
      if (st?.soldiers) {
        setSoldiers(st.soldiers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 4000);
    return () => clearInterval(t);
  }, [loadData]);

  const riskColor = (cat) => {
    const m = { NORMAL: '#16A34A', ELEVATED: '#F59E0B', HIGH: '#EA580C', CRITICAL: '#DC2626' };
    return m[cat] ?? '#475569';
  };

  // Filter logic
  const filteredSoldiers = soldiers.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.call_sign?.toLowerCase().includes(q) ||
      s.soldier_uid?.toLowerCase().includes(q) ||
      s.rank?.toLowerCase().includes(q);

    const matchesRisk = riskFilter === 'ALL' || (s.risk_category || 'NORMAL').toUpperCase() === riskFilter;
    const matchesSquad = squadFilter === 'ALL' || String(s.squad_id) === String(squadFilter);

    return matchesSearch && matchesRisk && matchesSquad;
  });

  return (
    <>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <User size={22} color="var(--saffron)" /> Personnel Directory &amp; Biometrics
          </h1>
          <p className="page-subtitle">Real-time operator biometrics, fatigue index &amp; tactical roster</p>
        </div>

        {/* View Switcher & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0.15rem' }}>
            <button
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('grid')}
              style={{ border: 'none', borderRadius: 'var(--r-sm)', padding: '0.35rem 0.65rem' }}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('list')}
              style={{ border: 'none', borderRadius: 'var(--r-sm)', padding: '0.35rem 0.65rem' }}
              title="List View"
            >
              <ListIcon size={15} />
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search soldier, UID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', fontSize: '0.82rem', height: '36px' }}
            />
          </div>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            style={{ fontSize: '0.82rem', height: '36px', minWidth: 130 }}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="NORMAL">Normal Risk</option>
            <option value="ELEVATED">Elevated Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="CRITICAL">Critical Risk</option>
          </select>

          {/* Squad Filter */}
          <select
            value={squadFilter}
            onChange={(e) => setSquadFilter(e.target.value)}
            style={{ fontSize: '0.82rem', height: '36px', minWidth: 130 }}
          >
            <option value="ALL">All Squads</option>
            {squads.map((sq) => (
              <option key={sq.id} value={sq.id}>{sq.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /><span>Loading personnel roster...</span></div>
      ) : (
        <>
          {/* Summary Metric Strip */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: '0.25rem' }}>
            <div className="stat-card-mini">
              <span className="label">Total Personnel</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{statusData?.total_soldiers ?? soldiers.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Monitored operators</div>
            </div>

            <div className="stat-card-mini">
              <span className="label">Avg Fatigue Index</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: riskColor(statusData?.avg_fatigue_score >= 55 ? 'HIGH' : statusData?.avg_fatigue_score >= 30 ? 'ELEVATED' : 'NORMAL') }}>
                {statusData?.avg_fatigue_score?.toFixed(1) ?? '0.0'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Scale 0-100</div>
            </div>

            <div className="stat-card-mini">
              <span className="label">Nominal Status</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ok)' }}>
                {statusData?.risk_distribution?.NORMAL ?? 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Normal vitals</div>
            </div>

            <div className="stat-card-mini">
              <span className="label">Active Risk Alerts</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: (statusData?.active_alert_count > 0) ? 'var(--critical)' : 'var(--navy-dark)' }}>
                {statusData?.active_alert_count ?? 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Requiring attention</div>
            </div>
          </div>

          {/* Filtering empty state */}
          {filteredSoldiers.length === 0 ? (
            <div className="state-center" style={{ flexDirection: 'column', gap: '0.5rem', padding: '3rem 0' }}>
              <User size={40} color="var(--border)" />
              <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No personnel matching query</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Try adjusting your search or risk filters.</div>
            </div>
          ) : viewMode === 'grid' ? (
            /* -- GRID CARDS VIEW -- */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              {filteredSoldiers.map((sol) => {
                const faScore = sol.fatigue_score ?? 0;
                const category = sol.risk_category || 'NORMAL';
                const hr = sol.mean_hr ? `${Math.round(sol.mean_hr)} BPM` : 'N/A';
                const temp = sol.temperature ? `${sol.temperature.toFixed(1)}\u00b0C` : 'N/A';
                const act = sol.latest_reading?.activity_label || 'PATROL';

                return (
                  <div
                    key={sol.soldier_id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      borderLeft: `4px solid ${riskColor(category)}`,
                    }}
                    onClick={() => navigate(`/soldiers/${sol.soldier_id}`)}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: 'var(--navy-dark)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: '#FFF'
                        }}>
                          <User size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy-dark)' }}>{sol.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {sol.rank} | {sol.call_sign}
                          </div>
                        </div>
                      </div>
                      <RiskBadge level={category} />
                    </div>

                    {/* Biometrics Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.5rem 0.65rem', borderRadius: 'var(--r-md)' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Heart Rate</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy-dark)' }}>{hr}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Body Temp</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy-dark)' }}>{temp}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Activity</div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--navy-dark)' }}>{act}</div>
                      </div>
                    </div>

                    {/* Fatigue Score Progress Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Fatigue Score</span>
                        <span style={{ fontWeight: 700, color: riskColor(category) }}>{faScore.toFixed(1)} / 100</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, faScore)}%`, height: '100%', background: riskColor(category), transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    {/* Footer Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                      <span className="mono" style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{sol.soldier_uid}</span>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => { e.stopPropagation(); navigate(`/soldiers/${sol.soldier_id}`); }}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        <span>Profile</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* -- DETAILED LIST VIEW -- */
            <div className="table-container" style={{ marginTop: '0.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>UID</th>
                    <th>Name</th>
                    <th>Call Sign</th>
                    <th>Rank</th>
                    <th>Risk Category</th>
                    <th>Fatigue Score</th>
                    <th>Heart Rate</th>
                    <th>Temp (\u00b0C)</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSoldiers.map((sol) => (
                    <tr
                      key={sol.soldier_id}
                      onClick={() => navigate(`/soldiers/${sol.soldier_id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="mono">{sol.soldier_uid}</td>
                      <td style={{ fontWeight: 700 }}>{sol.name}</td>
                      <td>{sol.call_sign}</td>
                      <td>{sol.rank}</td>
                      <td><RiskBadge level={sol.risk_category || 'NORMAL'} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, sol.fatigue_score ?? 0)}%`, height: '100%', background: riskColor(sol.risk_category) }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{(sol.fatigue_score ?? 0).toFixed(1)}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{sol.mean_hr ? `${Math.round(sol.mean_hr)} BPM` : 'N/A'}</td>
                      <td>{sol.temperature ? `${sol.temperature.toFixed(1)} \u00b0C` : 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/soldiers/${sol.soldier_id}`); }}
                          style={{ border: '1px solid var(--border)' }}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

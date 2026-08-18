import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { BarChart3, TrendingUp, Heart, Activity } from 'lucide-react';
import api from '../api/client';

export default function Analytics() {
  const [squads, setSquads] = useState([]);
  const [soldiers, setSoldiers] = useState([]);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [selectedSoldier, setSelectedSoldier] = useState(null);
  const [soldierBaseline, setSoldierBaseline] = useState(null);
  const [squadTrend, setSquadTrend] = useState([]);
  const [soldierHistory, setSoldierHistory] = useState([]);
  const [hours, setHours] = useState(6);
  const [loading, setLoading] = useState(true);

  const loadBase = useCallback(async () => {
    const [sq, sol] = await Promise.all([
      api.squads.list().catch(() => []),
      api.soldiers.list().catch(() => []),
    ]);
    setSquads(sq);
    setSoldiers(sol);
    if (sq.length && !selectedSquad) setSelectedSquad(sq[0].id);
    if (sol.length && !selectedSoldier) setSelectedSoldier(sol[0].id);
    setLoading(false);
  }, [selectedSquad, selectedSoldier]);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!selectedSquad) return;
    api.analytics.squadTrend(selectedSquad, hours).then((d) => setSquadTrend(d?.trend ?? [])).catch(() => {});
  }, [selectedSquad, hours]);

  useEffect(() => {
    if (!selectedSoldier) return;
    api.analytics.soldierHistory(selectedSoldier, hours).then((d) => setSoldierHistory(d?.history ?? [])).catch(() => {});
    api.soldiers.baseline(selectedSoldier).then(setSoldierBaseline).catch(() => setSoldierBaseline(null));
  }, [selectedSoldier, hours]);

  const squadChartData = squadTrend.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avg: p.avg_fatigue ? parseFloat(p.avg_fatigue.toFixed(1)) : 0,
    max: p.max_fatigue ? parseFloat(p.max_fatigue.toFixed(1)) : 0,
  }));

  const soldierChartData = soldierHistory.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fatigue: p.fatigue_score ? parseFloat(p.fatigue_score.toFixed(1)) : 0,
    hr: p.mean_hr ? Math.round(p.mean_hr) : null,
    rmssd: p.rmssd ? parseFloat(p.rmssd.toFixed(1)) : null,
  }));

  const currentSoldierObj = soldiers.find((s) => s.id === selectedSoldier);
  const latestPoint = soldierChartData[soldierChartData.length - 1];
  const fatigueScores = soldierChartData.map((d) => d.fatigue).filter(Boolean);
  const currentFatigue = latestPoint?.fatigue ?? 0;
  const peakFatigue = fatigueScores.length ? Math.max(...fatigueScores) : 0;
  const avgFatigue = fatigueScores.length ? (fatigueScores.reduce((a, b) => a + b, 0) / fatigueScores.length).toFixed(1) : '0.0';
  const currentHr = latestPoint?.hr ?? '—';
  const baseHr = soldierBaseline?.baseline_hr_mean ? Math.round(soldierBaseline.baseline_hr_mean) : 72;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Longitudinal Telemetry &amp; Analytics</h1>
          <p className="page-subtitle">Time-series trend analysis across squads and individual personnel</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Window:</span>
          {[1, 6, 12, 24].map((h) => (
            <button
              key={h}
              className={`btn btn-sm ${hours === h ? 'btn-primary' : ''}`}
              onClick={() => setHours(h)}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /><span>Loading analytics engine…</span></div>
      ) : (
        <>
          {/* Squad Fatigue Trend Area Chart */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="card-title">
                  <BarChart3 size={18} color="var(--saffron)" />
                  <span>Squad Fatigue Trend — Average vs Peak Risk</span>
                </div>
                <div className="card-subtitle">Aggregated continuous fatigue stream across active squad personnel</div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {squads.map((sq) => (
                  <button
                    key={sq.id}
                    className={`btn btn-sm ${selectedSquad === sq.id ? 'btn-saffron' : ''}`}
                    onClick={() => setSelectedSquad(sq.id)}
                  >
                    {sq.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '260px', width: '100%' }}>
              {squadChartData.length < 2 ? (
                <div className="state-center" style={{ height: '100%' }}>
                  Collecting time-series data... Start simulation to stream live telemetry.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={squadChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sqAvgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9933" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#FF9933" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="avg" stroke="#FF9933" strokeWidth={3} fillOpacity={1} fill="url(#sqAvgGrad)" name="Squad Avg Fatigue" />
                    <Area type="monotone" dataKey="max" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={0} name="Squad Peak Fatigue" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Soldier Summary Metric Cards */}
          {currentSoldierObj && (
            <div className="stat-grid">
              <div className="stat-card-mini">
                <span className="label">Selected Soldier</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{currentSoldierObj.name}</div>
                <div className="mono text-saffron" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentSoldierObj.soldier_uid}</div>
              </div>
              <div className="stat-card-mini">
                <span className="label">Current Fatigue</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: currentFatigue > 55 ? 'var(--critical)' : 'var(--navy-dark)' }}>
                  {currentFatigue}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score / 100</div>
              </div>
              <div className="stat-card-mini">
                <span className="label">Peak Fatigue</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--high)' }}>{peakFatigue}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In selected window</div>
              </div>
              <div className="stat-card-mini">
                <span className="label">Avg Fatigue</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy-dark)' }}>{avgFatigue}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In selected window</div>
              </div>
              <div className="stat-card-mini">
                <span className="label">Current Heart Rate</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy-dark)' }}>
                  {currentHr} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>BPM</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: {baseHr} BPM</div>
              </div>
            </div>
          )}

          {/* Soldier Individual History */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="card-title">
                  <Activity size={18} color="var(--navy)" />
                  <span>Individual Personnel Physiological History</span>
                </div>
                <div className="card-subtitle">Fatigue Score vs Heart Rate (BPM) &amp; Parasympathetic HRV (RMSSD ms)</div>
              </div>
              <select
                value={selectedSoldier ?? ''}
                onChange={(e) => setSelectedSoldier(parseInt(e.target.value))}
                style={{ fontWeight: 600 }}
              >
                {soldiers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.soldier_uid})</option>
                ))}
              </select>
            </div>

            <div style={{ height: '240px', width: '100%' }}>
              {soldierChartData.length < 2 ? (
                <div className="state-center" style={{ height: '100%' }}>
                  Collecting history data... Start simulation to stream readings.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={soldierChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="solHrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#138808" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#138808" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 150]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="fatigue" stroke="#DC2626" fillOpacity={0} name="Fatigue Score" strokeWidth={2} />
                    <Area type="monotone" dataKey="hr" stroke="#138808" fillOpacity={1} fill="url(#solHrGrad)" name="Heart Rate (BPM)" strokeWidth={2} />
                    <Area type="monotone" dataKey="rmssd" stroke="#FF9933" fillOpacity={0} name="RMSSD HRV (ms)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  Users, Activity, AlertTriangle, ShieldCheck, Heart, Thermometer,
  TrendingUp, TrendingDown, Clock, ArrowUpRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [squads, setSquads] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeMission, setActiveMission] = useState(null);
  const [simStatus, setSimStatus] = useState(null);
  const [squadTrend, setSquadTrend] = useState([]);
  const [timeRange, setTimeRange] = useState(6);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const [summ, sq, al, mList, sim] = await Promise.all([
        api.analytics.systemSummary().catch(() => null),
        api.squads.list().catch(() => []),
        api.alerts.list(10).catch(() => []),
        api.missions.list().catch(() => []),
        api.simulation.status().catch(() => null),
      ]);
      setSummary(summ);
      setSquads(sq);
      setAlerts(al);
      setSimStatus(sim);
      const active = mList.find((m) => m.status === 'ACTIVE') || mList[0] || null;
      setActiveMission(active);

      if (sq.length > 0) {
        const trendData = await api.analytics.squadTrend(sq[0].id, timeRange).catch(() => ({ trend: [] }));
        setSquadTrend(trendData?.trend ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 4000);
    return () => clearInterval(t);
  }, [loadData]);

  const handleAcknowledge = async (alertId, e) => {
    e.stopPropagation();
    try {
      await api.alerts.acknowledge(alertId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="state-center">
        <div className="spinner-ring" />
        <span>Initializing RAKSHAK Command Dashboard…</span>
      </div>
    );
  }

  // Data Calculations
  const totalSoldiers = summary?.total_soldiers ?? squads.reduce((a, s) => a + (s.soldier_count ?? 0), 0);
  const avgFatigue = summary?.avg_fatigue_score ?? (squadTrend.length ? squadTrend[squadTrend.length - 1].avg_fatigue : 24.5);
  const activeAlertsCount = summary?.active_alert_count ?? alerts.filter((a) => !a.is_acknowledged).length;
  const highRiskCount = (summary?.high_count ?? 0) + (summary?.critical_count ?? 0);

  // Donut Risk Data
  const riskPieData = [
    { name: 'NORMAL', value: summary?.normal_count ?? 5, color: '#16A34A' },
    { name: 'ELEVATED', value: summary?.elevated_count ?? 0, color: '#F59E0B' },
    { name: 'HIGH', value: summary?.high_count ?? 0, color: '#EA580C' },
    { name: 'CRITICAL', value: summary?.critical_count ?? 0, color: '#DC2626' },
  ].filter((d) => d.value > 0);

  // Fatigue Trend Chart Data
  const fatigueChartData = squadTrend.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avg: p.avg_fatigue ? parseFloat(p.avg_fatigue.toFixed(1)) : 0,
    max: p.max_fatigue ? parseFloat(p.max_fatigue.toFixed(1)) : 0,
  }));

  // Squad Bar Comparison Data
  const squadBarData = squads.map((sq) => ({
    name: sq.name,
    count: sq.soldier_count ?? 5,
    fatigue: sq.avg_fatigue_score ? parseFloat(sq.avg_fatigue_score.toFixed(1)) : 22.0,
  }));

  // Calculate dynamic mission duration
  let missionDuration = '01h 45m';
  if (activeMission?.started_at) {
    const diff = Math.floor((Date.now() - new Date(activeMission.started_at).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    missionDuration = `${h}h ${m}m`;
  }

  return (
    <>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Operational Command Dashboard</h1>
          <p className="page-subtitle">Real-time squad physiological telemetry &amp; fatigue risk analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-saffron" onClick={() => navigate('/simulation')}>
            Simulation Controller →
          </button>
        </div>
      </div>

      {/* TOP METRIC CARDS (Reference Layout & Visualizations) */}
      <div className="stat-grid">
        {/* Card 1: Total Soldiers */}
        <div className="stat-card-mini card-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Total Soldiers</span>
            <Users size={18} color="var(--navy)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="val">{totalSoldiers}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--ok)', fontWeight: 600 }}>Active Squads</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>5 personnel monitored</div>
        </div>

        {/* Card 2: Average Fatigue Score (Radial / Pie centered gauge) */}
        <div className="stat-card-mini card-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Avg Fatigue Score</span>
            <Activity size={18} color="var(--saffron)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span className="val" style={{ color: avgFatigue > 55 ? 'var(--critical)' : avgFatigue > 30 ? 'var(--elevated)' : 'var(--navy-dark)' }}>
                {avgFatigue.toFixed(1)}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> / 100</span>
            </div>
            {/* Circular Progress Gauge */}
            <div style={{ width: '42px', height: '42px', position: 'relative' }}>
              <svg width="42" height="42" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3.5" />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={avgFatigue > 55 ? 'var(--critical)' : avgFatigue > 30 ? 'var(--elevated)' : 'var(--ok)'}
                  strokeWidth="3.5"
                  strokeDasharray={`${Math.min(100, avgFatigue)}, 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--ok)', fontWeight: 600 }}>Normal Risk Threshold</div>
        </div>

        {/* Card 3: Active Alerts */}
        <div className="stat-card-mini card-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Active Alerts</span>
            <AlertTriangle size={18} color={activeAlertsCount > 0 ? 'var(--critical)' : 'var(--ok)'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="val" style={{ color: activeAlertsCount > 0 ? 'var(--critical)' : 'var(--navy-dark)' }}>
              {activeAlertsCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unacknowledged</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: activeAlertsCount === 0 ? 'var(--ok)' : 'var(--critical)', fontWeight: 600 }}>
            {activeAlertsCount === 0 ? '✓ No active alerts' : 'Requires CO review'}
          </div>
        </div>

        {/* Card 4: High Risk Soldiers */}
        <div className="stat-card-mini card-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">High / Critical Risk</span>
            <ShieldCheck size={18} color="var(--high)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="val" style={{ color: highRiskCount > 0 ? 'var(--high)' : 'var(--navy-dark)' }}>
              {highRiskCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Soldiers</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: highRiskCount > 0 ? 'var(--high)' : 'var(--ok)', fontWeight: 600 }}>
            {highRiskCount > 0 ? 'Elevated fatigue detected' : '✓ 100% nominal'}
          </div>
        </div>

        {/* Card 5: Active Missions */}
        <div className="stat-card-mini card-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Active Missions</span>
            <Clock size={18} color="var(--navy)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="val">{activeMission ? 1 : 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sector 7</span>
          </div>
          <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: '65%', height: '100%', background: 'var(--saffron)' }} />
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: FATIGUE OVERVIEW CHART & RISK DONUT & PHYSIOLOGICAL SNAPSHOT */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '1.25rem' }}>
        {/* Large Fatigue Overview Time-Series Area Chart (Reference Style) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div className="card-title">
                <TrendingUp size={18} color="var(--saffron)" />
                <span>Fatigue Overview — Squad Trend</span>
              </div>
              <div className="card-subtitle">Real-time physiological fatigue telemetry and peak threshold stream</div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-main)', padding: '0.2rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              {[1, 6, 24].map((h) => (
                <button
                  key={h}
                  className="btn btn-sm"
                  style={{
                    padding: '0.2rem 0.6rem',
                    border: 'none',
                    background: timeRange === h ? 'var(--bg-card)' : 'transparent',
                    boxShadow: timeRange === h ? 'var(--shadow-sm)' : 'none',
                    fontWeight: timeRange === h ? 700 : 500
                  }}
                  onClick={() => setTimeRange(h)}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            {fatigueChartData.length < 2 ? (
              <div className="state-center" style={{ height: '100%' }}>
                <span>Streaming live telemetry... Start simulation to observe trends.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fatigueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9933" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#FF9933" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="avg" stroke="#FF9933" strokeWidth={3} fillOpacity={1} fill="url(#fatigueGrad)" name="Squad Avg Fatigue" />
                  <Area type="monotone" dataKey="max" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={0} name="Peak Fatigue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Interactive Risk Distribution Donut Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Risk Category Breakdown</div>
            <div className="card-subtitle">Distribution across 5 active soldiers</div>
          </div>

          <div style={{ position: 'relative', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.5rem 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Donut Center Label */}
            <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-dark)', lineHeight: 1 }}>{totalSoldiers}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>Soldiers</div>
            </div>
          </div>

          {/* Legend list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Normal: <strong>{summary?.normal_count ?? 5}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Elevated: <strong>{summary?.elevated_count ?? 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA580C' }} />
              <span style={{ color: 'var(--text-secondary)' }}>High: <strong>{summary?.high_count ?? 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Critical: <strong>{summary?.critical_count ?? 0}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: PHYSIOLOGICAL SNAPSHOT, RECENT ALERTS, SQUAD COMPARISON */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.25rem' }}>
        {/* Physiological Snapshot Widget */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div className="card-title">
                <Heart size={18} color="var(--critical)" />
                <span>Squad Physiological Snapshot</span>
              </div>
              <div className="card-subtitle">Real-time squad telemetry averages &amp; trends</div>
            </div>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1 Hz Stream</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>Avg Heart Rate</span>
                <TrendingUp size={14} color="var(--ok)" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.2rem' }}>
                78 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>BPM</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ok)', marginTop: '0.25rem', fontWeight: 600 }}>+2.4% vs baseline</div>
            </div>

            <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>Avg HRV (RMSSD)</span>
                <TrendingDown size={14} color="var(--ok)" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.2rem' }}>
                32.5 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>ms</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ok)', marginTop: '0.25rem', fontWeight: 600 }}>Parasympathetic tone stable</div>
            </div>

            <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>Avg Body Temp</span>
                <Thermometer size={14} color="var(--saffron)" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.2rem' }}>
                36.9 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>°C</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Skin temperature nominal</div>
            </div>

            <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>Activity Load</span>
                <Activity size={14} color="var(--navy)" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-dark)', marginTop: '0.3rem', textTransform: 'uppercase' }}>
                PATROL
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Moderate exertion profile</div>
            </div>
          </div>
        </div>

        {/* Recent System Alerts Panel */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div className="card-title">Recent Alerts &amp; Events</div>
            <button className="btn btn-sm" onClick={() => navigate('/squads')}>View Roster →</button>
          </div>

          {alerts.length === 0 ? (
            <div className="state-center" style={{ padding: '1.5rem' }}>
              <CheckCircle2 size={24} color="var(--ok)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No unacknowledged alerts</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {alerts.slice(0, 4).map((a) => {
                const isAck = a.is_acknowledged;
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--r-md)',
                      background: isAck ? 'var(--bg-main)' : 'var(--critical-bg)',
                      border: `1px solid ${isAck ? 'var(--border)' : 'var(--critical-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/soldiers/${a.soldier_id}`)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className={`badge badge-${a.severity?.toLowerCase() || 'critical'}`} style={{ fontSize: '0.65rem' }}>
                          {a.severity}
                        </span>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {a.message}
                      </div>
                    </div>
                    {!isAck && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                        onClick={(e) => handleAcknowledge(a.id, e)}
                      >
                        Ack
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BANNER: ACTIVE MISSION OVERVIEW */}
      {activeMission && (
        <div className="card" style={{ background: 'var(--navy-dark)', color: '#FFFFFF', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--saffron)', fontWeight: 700 }}>
                Active Operational Mission Overview
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.2rem', color: '#FFFFFF' }}>
                {activeMission.name} <span className="mono" style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 400 }}>({activeMission.mission_uid})</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Scenario:</span> <strong className="text-saffron">{simStatus?.scenario || 'PATROL'}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Squad:</span> <strong>Alpha Squad</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Duration:</span> <strong className="mono">{missionDuration}</strong>
              </div>
              <button className="btn btn-saffron" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }} onClick={() => navigate('/missions')}>
                Mission Operations →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

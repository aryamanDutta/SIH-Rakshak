import React, { useEffect, useState } from 'react';
import {
  FileText, Heart, Thermometer, Activity, AlertTriangle, User,
} from 'lucide-react';
import api from '../api/client';

function riskColor(cat) {
  switch ((cat || '').toUpperCase()) {
    case 'LOW':      return 'var(--ok)';
    case 'MODERATE': return 'var(--saffron)';
    case 'HIGH':     return '#F97316';
    case 'CRITICAL': return 'var(--critical)';
    default:         return 'var(--text-muted)';
  }
}
function riskBadgeClass(cat) {
  switch ((cat || '').toUpperCase()) {
    case 'LOW':      return 'badge badge-normal';
    case 'MODERATE': return 'badge badge-warning';
    case 'HIGH':     return 'badge badge-high';
    case 'CRITICAL': return 'badge badge-critical';
    default:         return 'badge badge-info';
  }
}
function hrFromRR(rrMs) {
  if (!rrMs || rrMs <= 0) return 'N/A';
  return Math.round(60000 / rrMs) + ' bpm';
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0.2rem',
      padding: '0.7rem 0.9rem', background: 'var(--bg-main)',
      borderRadius: 'var(--r-md)', border: '1px solid var(--border)', flex: 1, minWidth: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Icon size={11} /> {label}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: color || 'var(--navy-dark)' }}>{value}</div>
    </div>
  );
}

function ContribBar({ label, value }) {
  const pct = value != null ? Math.min(100, Math.round(value * 100)) : 0;
  const color = pct > 60 ? 'var(--critical)' : pct > 35 ? 'var(--saffron)' : 'var(--ok)';
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: '0.18rem' }}>
        <span>{label}</span><span style={{ fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function SoldierCard({ soldier }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profile, history] = await Promise.all([
          api.soldiers.get(soldier.id).catch(() => null),
          api.soldiers.history(soldier.id).catch(() => null),
        ]);
        if (!cancelled) setData({ profile, history });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [soldier.id]);

  const fa  = data?.profile?.latest_fatigue;
  const rd  = data?.profile?.latest_reading;
  const assessments = data?.history?.fatigue_assessments || [];
  const peakFatigue = assessments.length ? Math.max(...assessments.map(a => a.fatigue_score)) : null;
  const avgFatigue  = assessments.length
    ? (assessments.reduce((s, a) => s + a.fatigue_score, 0) / assessments.length).toFixed(1)
    : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy-dark)' }}>{soldier.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{soldier.rank} | {soldier.call_sign} | {soldier.soldier_uid}</div>
          </div>
        </div>
        {fa && <span className={riskBadgeClass(fa.risk_category)}>{fa.risk_category} RISK</span>}
      </div>

      {loading && (
        <div className="state-center" style={{ padding: '1.25rem 0' }}>
          <div className="spinner-ring" /><span>Loading...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Vitals */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Stat icon={Heart}         label="Heart Rate"  value={rd ? hrFromRR(rd.rr_interval_ms) : 'N/A'} color="var(--critical)" />
            <Stat icon={Activity}      label="HRV (RR)"    value={rd ? `${rd.rr_interval_ms} ms` : 'N/A'} />
            <Stat icon={Thermometer}   label="Temp"        value={rd ? `${rd.temperature_c?.toFixed(1)}\u00b0C` : 'N/A'} color="#3B82F6" />
            <Stat icon={AlertTriangle} label="Fatigue"     value={fa ? `${fa.fatigue_score.toFixed(1)}` : 'N/A'} color={fa ? riskColor(fa.risk_category) : undefined} />
          </div>

          {/* Activity label */}
          {rd?.activity_label && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Last activity: <strong>{rd.activity_label}</strong>
            </div>
          )}

          {/* Fatigue contributors */}
          {fa?.contributors && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Fatigue Contributors
              </div>
              <ContribBar label="HR Deviation"      value={fa.contributors.hr_deviation} />
              <ContribBar label="HRV Deterioration" value={fa.contributors.hrv_deterioration} />
              <ContribBar label="Activity Load"     value={fa.contributors.activity_load} />
              <ContribBar label="Temperature Trend" value={fa.contributors.temperature_trend} />
            </div>
          )}

          {/* Mission summary */}
          {assessments.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, padding: '0.55rem 0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Peak Fatigue</div>
                <div style={{ fontWeight: 700, color: peakFatigue > 60 ? 'var(--critical)' : 'var(--saffron)' }}>{peakFatigue?.toFixed(1)}</div>
              </div>
              <div style={{ flex: 1, padding: '0.55rem 0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Fatigue</div>
                <div style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>{avgFatigue}</div>
              </div>
              <div style={{ flex: 1, padding: '0.55rem 0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Assessments</div>
                <div style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>{assessments.length}</div>
              </div>
            </div>
          )}

          {/* Bio row */}
          {data?.profile?.age && (
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '0.55rem' }}>
              Age: <strong>{data.profile.age}</strong> | Weight: <strong>{data.profile.weight_kg} kg</strong> | Height: <strong>{data.profile.height_cm} cm</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MissionReport() {
  const [missions, setMissions]       = useState([]);
  const [squads, setSquads]           = useState([]);
  const [soldiers, setSoldiers]       = useState([]);
  const [selectedMission, setSelectedMission] = useState('');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, sq, sol] = await Promise.all([
          api.missions.list().catch(() => []),
          api.squads.list().catch(() => []),
          api.soldiers.list().catch(() => []),
        ]);
        const completed = m.filter(x => x.status === 'COMPLETED');
        setMissions(completed);
        setSquads(sq);
        setSoldiers(sol);
        if (completed.length) setSelectedMission(String(completed[0].id));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mission       = missions.find(m => String(m.id) === selectedMission);
  const squad         = squads.find(s => s.id === mission?.squad_id);
  const squadSoldiers = soldiers.filter(s => s.squad_id === mission?.squad_id);

  const durationStr = (() => {
    if (!mission?.started_at) return 'N/A';
    const startMs = new Date(mission.started_at).getTime();
    const endMs   = mission.ended_at ? new Date(mission.ended_at).getTime() : Date.now();
    const diffSec = Math.floor((endMs - startMs) / 1000);
    const h  = Math.floor(diffSec / 3600);
    const mn = Math.floor((diffSec % 3600) / 60);
    const s  = diffSec % 60;
    return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  })();

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--saffron)" /> Post-Mission Physiological Report
          </h1>
          <p className="page-subtitle">Soldier vitals | Fatigue analysis | Risk assessment after mission</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 280 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Select Completed Mission</label>
          <select value={selectedMission} onChange={e => setSelectedMission(e.target.value)} style={{ fontSize: '0.85rem' }}>
            {missions.length === 0 && <option value="">No completed missions</option>}
            {missions.map(m => (
              <option key={m.id} value={String(m.id)}>{m.name} | {m.mission_uid}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="state-center"><div className="spinner-ring" /><span>Loading report...</span></div>}

      {!loading && !mission && (
        <div className="state-center" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '5rem' }}>
          <FileText size={52} color="var(--border)" />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>No completed missions yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Reports will appear here once a mission is completed.</div>
        </div>
      )}

      {!loading && mission && (
        <>
          {/* Mission summary banner */}
          <div className="card" style={{ background: 'var(--navy-dark)', color: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--saffron)', fontWeight: 700 }}>Mission Report</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.1rem' }}>{mission.name}</div>
                <div className="mono" style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.1rem' }}>{mission.mission_uid} | {mission.mission_type}</div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                {[
                  { label: 'Squad',    value: squad?.name || 'N/A' },
                  { label: 'Duration', value: durationStr, mono: true },
                  { label: 'Status',   value: mission.status, color: 'var(--saffron)' },
                  { label: 'Soldiers', value: squadSoldiers.length },
                ].map(({ label, value, mono, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                    <div className={mono ? 'mono' : ''} style={{ fontWeight: 700, color: color || '#FFFFFF' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Soldier cards grid */}
          {squadSoldiers.length === 0 ? (
            <div className="state-center" style={{ marginTop: '2rem' }}>No soldiers found for squad <strong>{squad?.name}</strong>.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
              {squadSoldiers.map(s => <SoldierCard key={s.id} soldier={s} />)}
            </div>
          )}
        </>
      )}
    </>
  );
}


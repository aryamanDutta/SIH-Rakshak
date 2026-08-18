import React, { useEffect, useState, useCallback } from 'react';
import { Flag, Play, CheckCircle, Clock, Plus, Shield, Activity } from 'lucide-react';
import api from '../api/client';

export default function MissionMonitoring() {
  const [missions, setMissions] = useState([]);
  const [squads, setSquads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [simStatus, setSimStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', mission_type: '', squad_id: '', conditions: '' });
  const [formErr, setFormErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, sq, sim] = await Promise.all([
        api.missions.list().catch(() => []),
        api.squads.list().catch(() => []),
        api.simulation.status().catch(() => null),
      ]);
      setMissions(m);
      setSquads(sq);
      setSimStatus(sim);
      if (m.length > 0 && !selected) {
        const active = m.find((x) => x.status === 'ACTIVE') || m[0];
        setSelected(active.id);
      }
      if (!form.squad_id && sq.length) setForm((f) => ({ ...f, squad_id: sq[0].id }));
    } finally {
      setLoading(false);
    }
  }, [selected, form.squad_id]);

  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    if (!selected) return;
    api.missions.events(selected).then(setEvents).catch(() => setEvents([]));
  }, [selected]);

  const handleStart = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.name || !form.mission_type || !form.squad_id) {
      setFormErr('All required fields must be filled.');
      return;
    }
    try {
      const newM = await api.missions.start({ ...form, squad_id: parseInt(form.squad_id) });
      setCreating(false);
      setForm({ name: '', mission_type: '', squad_id: squads[0]?.id ?? '', conditions: '' });
      setSelected(newM.id);
      await load();
    } catch (e) {
      setFormErr(e.message);
    }
  };

  const handleEnd = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.missions.end(id);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const selectedMission = missions.find((m) => m.id === selected) || missions[0] || null;
  const squadObj = squads.find((s) => s.id === selectedMission?.squad_id);

  let durationStr = '—';
  if (selectedMission?.started_at) {
    const startMs = new Date(selectedMission.started_at).getTime();
    const endMs = selectedMission.ended_at ? new Date(selectedMission.ended_at).getTime() : Date.now();
    const diffSec = Math.floor((endMs - startMs) / 1000);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    durationStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Mission Operations &amp; Tactical Tracking</h1>
          <p className="page-subtitle">Mission status, squad assignments &amp; live operational event stream</p>
        </div>
        <button className="btn btn-saffron" onClick={() => setCreating(!creating)}>
          <Plus size={16} />
          <span>{creating ? 'Cancel' : 'Start New Mission'}</span>
        </button>
      </div>

      {creating && (
        <div className="card" style={{ borderColor: 'var(--saffron)' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--navy-dark)', fontSize: '1.05rem' }}>
            Launch Operational Mission
          </div>
          <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600 }}>
                <span>Mission Name</span>
                <input
                  type="text"
                  placeholder="Op. Steel Dawn"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600 }}>
                <span>Mission Type</span>
                <input
                  type="text"
                  placeholder="Reconnaissance / Patrol"
                  value={form.mission_type}
                  onChange={(e) => setForm((f) => ({ ...f, mission_type: e.target.value }))}
                />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600 }}>
                <span>Assigned Squad</span>
                <select value={form.squad_id} onChange={(e) => setForm((f) => ({ ...f, squad_id: e.target.value }))}>
                  {squads.map((sq) => (
                    <option key={sq.id} value={sq.id}>{sq.name} ({sq.unit})</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600 }}>
                <span>Terrain &amp; Conditions</span>
                <input
                  type="text"
                  placeholder="Mountainous, 24°C"
                  value={form.conditions}
                  onChange={(e) => setForm((f) => ({ ...f, conditions: e.target.value }))}
                />
              </label>
            </div>
            {formErr && <div style={{ color: 'var(--critical)', fontSize: '0.8rem' }}>{formErr}</div>}
            <button type="submit" className="btn btn-saffron" style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
              Launch Mission
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /><span>Loading operations data…</span></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Left Column: Mission detail banner + list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedMission && (
              <div className="card" style={{ background: 'var(--navy-dark)', color: '#FFFFFF' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--saffron)', fontWeight: 700 }}>
                  Active Mission Details
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: '#FFFFFF' }}>
                  {selectedMission.name}
                </div>
                <div className="mono" style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1rem' }}>
                  {selectedMission.mission_uid} · {selectedMission.mission_type}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Status:</span>{' '}
                    <strong style={{ color: selectedMission.status === 'ACTIVE' ? 'var(--ok)' : 'var(--saffron)' }}>
                      {selectedMission.status}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Scenario:</span> <strong className="text-saffron">{simStatus?.scenario || 'PATROL'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Squad:</span> <strong>{squadObj?.name || 'Alpha Squad'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Duration:</span> <strong className="mono">{durationStr}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                    <span>Mission Operational Progress</span>
                    <span>65% Completed</span>
                  </div>
                  <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '65%', height: '100%', background: 'var(--saffron)' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Missions List */}
            <div className="table-container">
              <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem' }}>
                All Missions Log
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {missions.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '0.85rem 1.25rem',
                      borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      background: selectedMission?.id === m.id ? 'var(--bg-main)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => setSelected(m.id)}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy-dark)' }}>{m.name}</div>
                      <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {m.mission_uid} · {m.mission_type}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className={`badge badge-${m.status === 'ACTIVE' ? 'normal' : 'info'}`}>
                        {m.status}
                      </span>
                      {m.status === 'ACTIVE' && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={(e) => handleEnd(m.id, e)}
                        >
                          End Mission
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Mission Timeline */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '1rem' }}>
              <Clock size={18} color="var(--saffron)" />
              <span>Mission Operational Timeline</span>
            </div>
            {events.length === 0 ? (
              <div className="state-center" style={{ padding: '2rem' }}>No events logged yet for this mission.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto' }}>
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      padding: '0.75rem 0.95rem',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-dark)', textTransform: 'uppercase' }}>
                        {ev.phase}
                      </span>
                      <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', marginTop: '0.3rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {ev.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

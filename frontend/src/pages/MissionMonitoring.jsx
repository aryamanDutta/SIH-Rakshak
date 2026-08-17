import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

const STATUS_COLOR = {
  PLANNED: 'var(--text-muted)',
  ACTIVE: 'var(--ok)',
  COMPLETED: 'var(--accent)',
  ABORTED: 'var(--critical)',
};

export default function MissionMonitoring() {
  const [missions, setMissions] = useState([]);
  const [squads, setSquads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name:'', mission_type:'', squad_id:'', conditions:'' });
  const [formErr, setFormErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, sq] = await Promise.all([
        api.missions.list().catch(() => []),
        api.squads.list().catch(() => []),
      ]);
      setMissions(m);
      setSquads(sq);
      if (!form.squad_id && sq.length) setForm(f => ({ ...f, squad_id: sq[0].id }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    if (!selected) return;
    api.missions.events(selected).then(setEvents).catch(() => setEvents([]));
  }, [selected]);

  const handleStart = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.name || !form.mission_type || !form.squad_id) {
      setFormErr('All fields required.'); return;
    }
    try {
      await api.missions.start({ ...form, squad_id: parseInt(form.squad_id) });
      setCreating(false);
      setForm({ name:'', mission_type:'', squad_id: squads[0]?.id ?? '', conditions:'' });
      await load();
    } catch (e) {
      setFormErr(e.message);
    }
  };

  const handleEnd = async (id) => {
    await api.missions.end(id).catch(console.error);
    await load();
  };

  const selectedMission = missions.find(m => m.id === selected);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Mission Monitoring</h1>
        <button className="btn btn-accent" onClick={() => setCreating(!creating)}>
          {creating ? '✕ Cancel' : '+ Start Mission'}
        </button>
      </div>

      {creating && (
        <div className="card">
          <div style={{fontWeight:600, marginBottom:'1rem'}}>Start New Mission</div>
          <form onSubmit={handleStart} style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
              <label style={{display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.82rem'}}>
                <span style={{color:'var(--text-muted)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.06em'}}>Mission Name</span>
                <input
                  style={{padding:'0.55rem 0.8rem', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text-primary)', fontFamily:'var(--font-sans)', outline:'none'}}
                  value={form.name}
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="Op. Steel Dawn"
                />
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.82rem'}}>
                <span style={{color:'var(--text-muted)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.06em'}}>Mission Type</span>
                <input
                  style={{padding:'0.55rem 0.8rem', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text-primary)', fontFamily:'var(--font-sans)', outline:'none'}}
                  value={form.mission_type}
                  onChange={e => setForm(f => ({...f, mission_type: e.target.value}))}
                  placeholder="Reconnaissance"
                />
              </label>
            </div>
            <label style={{display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.82rem'}}>
              <span style={{color:'var(--text-muted)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.06em'}}>Squad</span>
              <select
                style={{padding:'0.55rem 0.8rem', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text-primary)', fontFamily:'var(--font-sans)', outline:'none'}}
                value={form.squad_id}
                onChange={e => setForm(f => ({...f, squad_id: e.target.value}))}
              >
                {squads.map(sq => <option key={sq.id} value={sq.id}>{sq.name}</option>)}
              </select>
            </label>
            {formErr && <div style={{color:'var(--critical)', fontSize:'0.8rem'}}>{formErr}</div>}
            <button type="submit" className="btn btn-accent" style={{alignSelf:'flex-start'}}>
              Launch Mission
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /></div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', alignItems:'start'}}>
          {/* Mission list */}
          <div className="card" style={{padding:0}}>
            <div style={{padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)', fontWeight:600}}>
              All Missions
            </div>
            {missions.length === 0 ? (
              <div className="state-center" style={{padding:'2rem'}}>No missions. Click "+ Start Mission".</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column'}}>
                {missions.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding:'0.85rem 1.25rem',
                      borderBottom:'1px solid var(--border)',
                      cursor:'pointer',
                      background: selected === m.id ? 'var(--bg-surface)' : 'transparent',
                      transition: 'background var(--t-fast)',
                      display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem'
                    }}
                    onClick={() => setSelected(m.id === selected ? null : m.id)}
                  >
                    <div>
                      <div style={{fontWeight:600, fontSize:'0.9rem'}}>{m.name}</div>
                      <div style={{fontSize:'0.75rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:'0.2rem'}}>
                        {m.mission_uid} · {m.mission_type}
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                      <span style={{
                        fontSize:'0.72rem', fontWeight:600, color: STATUS_COLOR[m.status],
                        background:'var(--bg-overlay)', border:`1px solid ${STATUS_COLOR[m.status]}`,
                        padding:'0.15rem 0.5rem', borderRadius:'20px', textTransform:'uppercase'
                      }}>
                        {m.status}
                      </span>
                      {m.status === 'ACTIVE' && (
                        <button
                          className="btn btn-danger"
                          style={{padding:'0.2rem 0.6rem', fontSize:'0.72rem'}}
                          onClick={(e) => { e.stopPropagation(); handleEnd(m.id); }}
                        >
                          End
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mission events */}
          <div className="card">
            <div style={{fontWeight:600, marginBottom:'1rem'}}>
              {selectedMission ? `Events — ${selectedMission.name}` : 'Select a mission to view events'}
            </div>
            {!selected ? (
              <div className="state-center" style={{padding:'2rem', color:'var(--text-muted)'}}>
                ← Select a mission
              </div>
            ) : events.length === 0 ? (
              <div className="state-center" style={{padding:'2rem'}}>No events recorded.</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'400px', overflowY:'auto'}}>
                {events.map((ev) => (
                  <div key={ev.id} style={{
                    padding:'0.6rem 0.8rem', borderRadius:'var(--r-md)',
                    background:'var(--bg-surface)', border:'1px solid var(--border)'
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span style={{fontSize:'0.78rem', fontWeight:600, color:'var(--accent)', textTransform:'uppercase'}}>{ev.phase}</span>
                      <span style={{fontSize:'0.7rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{fontSize:'0.82rem', marginTop:'0.3rem', color:'var(--text-secondary)'}}>{ev.description}</div>
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

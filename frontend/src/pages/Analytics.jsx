import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import api from '../api/client';

const RISK_COLORS = {
  NORMAL: 'var(--ok)',
  ELEVATED: 'var(--elevated)',
  HIGH: 'var(--high)',
  CRITICAL: 'var(--critical)',
};

export default function Analytics() {
  const [squads, setSquads] = useState([]);
  const [soldiers, setSoldiers] = useState([]);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [selectedSoldier, setSelectedSoldier] = useState(null);
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
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!selectedSquad) return;
    api.analytics.squadTrend(selectedSquad, hours).then(d => setSquadTrend(d?.trend ?? [])).catch(() => {});
  }, [selectedSquad, hours]);

  useEffect(() => {
    if (!selectedSoldier) return;
    api.analytics.soldierHistory(selectedSoldier, hours).then(d => setSoldierHistory(d?.history ?? [])).catch(() => {});
  }, [selectedSoldier, hours]);

  const squadChartData = squadTrend.map(p => ({
    t: new Date(p.timestamp).toLocaleTimeString(),
    avg_fatigue: p.avg_fatigue?.toFixed(1),
    max_fatigue: p.max_fatigue?.toFixed(1),
  }));

  const soldierChartData = soldierHistory.map(p => ({
    t: new Date(p.timestamp).toLocaleTimeString(),
    fatigue: p.fatigue_score?.toFixed(1),
    hr: p.mean_hr?.toFixed(0),
    rmssd: p.rmssd?.toFixed(1),
    temp: p.temperature?.toFixed(1),
  }));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
          <span style={{fontSize:'0.78rem', color:'var(--text-muted)'}}>Window:</span>
          {[1, 6, 12, 24].map(h => (
            <button
              key={h}
              className={`btn ${hours === h ? 'btn-accent' : ''}`}
              style={{padding:'0.3rem 0.6rem', fontSize:'0.78rem'}}
              onClick={() => setHours(h)}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /></div>
      ) : (
        <>
          {/* Squad trend */}
          <div className="card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
              <div style={{fontWeight:600}}>Squad Fatigue Trend</div>
              <div style={{display:'flex', gap:'0.5rem'}}>
                {squads.map(sq => (
                  <button
                    key={sq.id}
                    className={`btn ${selectedSquad === sq.id ? 'btn-accent' : ''}`}
                    style={{padding:'0.25rem 0.6rem', fontSize:'0.78rem'}}
                    onClick={() => setSelectedSquad(sq.id)}
                  >
                    {sq.name}
                  </button>
                ))}
              </div>
            </div>
            {squadChartData.length < 2 ? (
              <div className="state-center" style={{padding:'2rem'}}>
                Not enough data yet. Start the simulation to collect readings.
              </div>
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={squadChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="t" tick={{fill:'var(--text-muted)', fontSize:10}} interval="preserveStartEnd" />
                    <YAxis domain={[0,100]} tick={{fill:'var(--text-muted)', fontSize:10}} />
                    <Tooltip
                      contentStyle={{background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)'}}
                    />
                    <Legend wrapperStyle={{fontSize:11, color:'var(--text-secondary)'}} />
                    <Line type="monotone" dataKey="avg_fatigue" stroke="var(--elevated)" dot={false} name="Avg Fatigue" strokeWidth={2} />
                    <Line type="monotone" dataKey="max_fatigue" stroke="var(--critical)" dot={false} name="Max Fatigue" strokeWidth={2} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Soldier history */}
          <div className="card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem'}}>
              <div style={{fontWeight:600}}>Soldier Physiological History</div>
              <select
                style={{padding:'0.35rem 0.7rem', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', color:'var(--text-primary)', fontFamily:'var(--font-sans)', fontSize:'0.82rem', outline:'none'}}
                value={selectedSoldier ?? ''}
                onChange={e => setSelectedSoldier(parseInt(e.target.value))}
              >
                {soldiers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.soldier_uid})</option>)}
              </select>
            </div>
            {soldierChartData.length < 2 ? (
              <div className="state-center" style={{padding:'2rem'}}>Not enough data. Run simulation first.</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
                {/* Fatigue + HR */}
                <div>
                  <div style={{fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.5rem'}}>Fatigue Score &amp; Heart Rate</div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={soldierChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="t" tick={{fill:'var(--text-muted)', fontSize:10}} interval="preserveStartEnd" />
                        <YAxis yAxisId="f" domain={[0,100]} tick={{fill:'var(--text-muted)', fontSize:10}} />
                        <YAxis yAxisId="hr" orientation="right" tick={{fill:'var(--text-muted)', fontSize:10}} />
                        <Tooltip contentStyle={{background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)'}} />
                        <Legend wrapperStyle={{fontSize:11}} />
                        <Line yAxisId="f" type="monotone" dataKey="fatigue" stroke="var(--critical)" dot={false} name="Fatigue" strokeWidth={2} />
                        <Line yAxisId="hr" type="monotone" dataKey="hr" stroke="var(--accent)" dot={false} name="HR (bpm)" strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* HRV */}
                <div>
                  <div style={{fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.5rem'}}>HRV — RMSSD (ms)</div>
                  <div className="chart-wrap" style={{height:160}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={soldierChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="t" tick={{fill:'var(--text-muted)', fontSize:10}} interval="preserveStartEnd" />
                        <YAxis tick={{fill:'var(--text-muted)', fontSize:10}} />
                        <Tooltip contentStyle={{background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)'}} />
                        <Line type="monotone" dataKey="rmssd" stroke="var(--ok)" dot={false} name="RMSSD (ms)" strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, Settings, Maximize, Minimize, LogOut,
  UserCheck, Shield, AlertTriangle, ChevronRight, X
} from 'lucide-react';
import api from '../api/client';

export default function Header({ user, onLogout, simRunning, onOpenSettings }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ soldiers: [], squads: [], missions: [] });
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showAlertsDrop, setShowAlertsDrop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [istTime, setIstTime] = useState('');
  const searchRef = useRef(null);
  const alertRef = useRef(null);
  const navigate = useNavigate();

  // IST Clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setIstTime(new Intl.DateTimeFormat('en-IN', options).format(now) + ' IST');
    };
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, []);

  // Poll Active Alerts for Notification Bell
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const al = await api.alerts.list(10, true);
        setActiveAlerts(al);
      } catch (_) {}
    };
    fetchAlerts();
    const t = setInterval(fetchAlerts, 5000);
    return () => clearInterval(t);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchDrop(false);
      if (alertRef.current && !alertRef.current.contains(e.target)) setShowAlertsDrop(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Search Query Effect
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults({ soldiers: [], squads: [], missions: [] });
      setShowSearchDrop(false);
      return;
    }
    const searchData = async () => {
      try {
        const [sol, sq, mis] = await Promise.all([
          api.soldiers.list().catch(() => []),
          api.squads.list().catch(() => []),
          api.missions.list().catch(() => []),
        ]);
        const q = query.toLowerCase();
        const filteredSol = sol.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.soldier_uid.toLowerCase().includes(q) ||
            s.call_sign.toLowerCase().includes(q)
        ).slice(0, 5);
        const filteredSq = sq.filter(
          (s) => s.name.toLowerCase().includes(q) || s.unit.toLowerCase().includes(q)
        ).slice(0, 3);
        const filteredMis = mis.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.mission_uid.toLowerCase().includes(q) ||
            m.mission_type.toLowerCase().includes(q)
        ).slice(0, 3);

        setSearchResults({ soldiers: filteredSol, squads: filteredSq, missions: filteredMis });
        setShowSearchDrop(true);
      } catch (err) {
        console.error(err);
      }
    };
    const debounce = setTimeout(searchData, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleAckAlert = async (id, e) => {
    e.stopPropagation();
    try {
      await api.alerts.acknowledge(id);
      setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header style={{
      height: '64px',
      background: '#FFFFFF',       /* pure white header — matches reference */
      borderBottom: '1px solid #E8E0D5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.75rem',
      position: 'relative',
      zIndex: 40,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
    }}>
      {/* Search Input Bar (Reference Style) */}
      <div ref={searchRef} style={{ position: 'relative', width: '340px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: '0.45rem 0.85rem',
          transition: 'border-color var(--t-fast), box-shadow var(--t-fast)'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search soldiers, squads, missions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setShowSearchDrop(true)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: '0.84rem',
              width: '100%',
              outline: 'none',
              color: 'var(--text-primary)'
            }}
          />
          {query && (
            <X size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setQuery('')} />
          )}
        </div>

        {/* Autocomplete Search Dropdown */}
        {showSearchDrop && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-md)',
            maxHeight: '380px',
            overflowY: 'auto',
            zIndex: 100,
            padding: '0.5rem 0'
          }}>
            {searchResults.soldiers.length > 0 && (
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0.4rem 1rem 0.2rem' }}>
                  Soldiers
                </div>
                {searchResults.soldiers.map((s) => (
                  <div
                    key={s.id}
                    style={{ padding: '0.55rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background var(--t-fast)' }}
                    onClick={() => { navigate(`/soldiers/${s.id}`); setQuery(''); setShowSearchDrop(false); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{s.call_sign} · {s.rank}</div>
                    </div>
                    <span className="mono text-saffron" style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.soldier_uid}</span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.squads.length > 0 && (
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0.5rem 1rem 0.2rem', borderTop: '1px solid var(--border-light)' }}>
                  Squads
                </div>
                {searchResults.squads.map((sq) => (
                  <div
                    key={sq.id}
                    style={{ padding: '0.55rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => { navigate(`/squads/${sq.id}`); setQuery(''); setShowSearchDrop(false); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sq.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sq.unit}</div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.missions.length > 0 && (
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0.5rem 1rem 0.2rem', borderTop: '1px solid var(--border-light)' }}>
                  Missions
                </div>
                {searchResults.missions.map((m) => (
                  <div
                    key={m.id}
                    style={{ padding: '0.55rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => { navigate('/missions'); setQuery(''); setShowSearchDrop(false); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{m.mission_type}</div>
                    </div>
                    <span className="badge badge-normal" style={{ fontSize: '0.68rem' }}>{m.status}</span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.soldiers.length === 0 && searchResults.squads.length === 0 && searchResults.missions.length === 0 && (
              <div style={{ padding: '1rem', textStyle: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No matching soldiers, squads, or missions found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls Header Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Live Simulation Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--r-full)',
          background: simRunning ? 'var(--ok-bg)' : 'var(--bg-input)',
          border: `1px solid ${simRunning ? 'var(--ok-border)' : 'var(--border)'}`,
          fontSize: '0.78rem',
          fontWeight: 700,
          color: simRunning ? 'var(--ok)' : 'var(--text-muted)'
        }}>
          <span className={`status-dot ${simRunning ? 'normal' : ''}`} style={{ background: simRunning ? 'var(--ok)' : 'var(--text-muted)' }} />
          <span>{simRunning ? 'SIM ACTIVE' : 'SIM IDLE'}</span>
        </div>

        {/* IST Clock */}
        <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy-dark)' }}>
          {istTime}
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Notification Bell */}
          <div ref={alertRef} style={{ position: 'relative' }}>
            <button
              className="btn btn-icon"
              style={{ position: 'relative', border: 'none', background: 'transparent' }}
              onClick={() => setShowAlertsDrop(!showAlertsDrop)}
              title="System Alerts"
            >
              <Bell size={18} color="var(--text-secondary)" />
              {activeAlerts.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: 'var(--critical)',
                  color: '#FFFFFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {activeAlerts.length}
                </span>
              )}
            </button>

            {/* Active Alerts Dropdown */}
            {showAlertsDrop && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '340px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 100,
                padding: '0.75rem 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem 0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--navy-dark)' }}>Active Alerts ({activeAlerts.length})</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--saffron)', fontWeight: 600, cursor: 'pointer' }} onClick={() => { navigate('/dashboard'); setShowAlertsDrop(false); }}>
                    View All →
                  </span>
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {activeAlerts.length === 0 ? (
                    <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ✓ No active unacknowledged alerts
                    </div>
                  ) : (
                    activeAlerts.map((a) => (
                      <div key={a.id} style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={`badge badge-${a.severity?.toLowerCase() || 'critical'}`} style={{ fontSize: '0.65rem' }}>
                            {a.severity}
                          </span>
                          <button className="btn btn-sm" style={{ padding: '0.15rem 0.4rem', fontSize: '0.68rem' }} onClick={(e) => handleAckAlert(a.id, e)}>
                            Ack
                          </button>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{a.message}</div>
                        <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleTimeString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button className="btn btn-icon" style={{ border: 'none', background: 'transparent' }} onClick={toggleFullscreen} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize size={18} color="var(--text-secondary)" /> : <Maximize size={18} color="var(--text-secondary)" />}
          </button>

          {/* Settings */}
          <button className="btn btn-icon" style={{ border: 'none', background: 'transparent' }} onClick={onOpenSettings} title="Settings">
            <Settings size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Commanding Officer User Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--r-full)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'var(--navy-dark)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            CO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-dark)', lineHeight: 1.1 }}>Col. S. Kapoor</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Commanding Officer</span>
          </div>
          <button className="btn btn-icon" style={{ border: 'none', background: 'transparent', padding: '0.2rem', marginLeft: '0.2rem' }} onClick={onLogout} title="Logout">
            <LogOut size={15} color="var(--critical)" />
          </button>
        </div>
      </div>
    </header>
  );
}

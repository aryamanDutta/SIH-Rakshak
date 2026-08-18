import { useState } from 'react';
import RakshakLogo from '../components/RakshakLogo';

export default function Login({ onLogin }) {
  const [id, setId] = useState('CMD-001');
  const [pwd, setPwd] = useState('rakshak2026');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    setTimeout(() => {
      if (id && pwd) {
        onLogin({ id, role: 'commander' });
      } else {
        setErr('Enter your Operator ID and passphrase.');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F5EEDC',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── High-sharpness crisp background image layer ── */}
      <img
        src="/login-bg.jpg"
        alt="RAKSHAK Command Background"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'bottom center',
          filter: 'contrast(1.06) brightness(1.02) saturate(1.04)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Login card (100% UNCHANGED) ── */}
      <div className="card" style={{ width: '420px', padding: '2.25rem', boxShadow: 'var(--shadow-lg)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
          <RakshakLogo size="large" clickable={false} />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Tactical Operations Command &amp; Telemetry
          </p>
        </div>

        <div style={{ padding: '0.6rem 0.85rem', background: 'var(--saffron-light)', border: '1px solid var(--saffron-border)', borderRadius: 'var(--r-md)', fontSize: '0.78rem', color: 'var(--navy-dark)', marginBottom: '1.25rem' }}>
          ⚠ <strong>SIH Prototype Mode:</strong> Heuristic fatigue risk estimation platform powered by simulated telemetry.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
            <span style={{ color: 'var(--navy-dark)' }}>Operator ID</span>
            <input
              type="text"
              placeholder="e.g. CMD-001"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoFocus
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
            <span style={{ color: 'var(--navy-dark)' }}>Passphrase</span>
            <input
              type="password"
              placeholder="••••••••"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
          </label>

          {err && <div style={{ color: 'var(--critical)', fontSize: '0.8rem' }}>{err}</div>}

          <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem', marginTop: '0.5rem', fontSize: '0.9rem' }} disabled={loading}>
            {loading ? <div className="spinner-ring" style={{ width: '18px', height: '18px' }} /> : 'Access Command Console →'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          RAKSHAK v0.1.0 — SIH Software Prototype Engine
        </div>
      </div>
    </div>
  );
}

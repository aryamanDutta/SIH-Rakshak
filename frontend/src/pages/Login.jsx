import { useState } from 'react';
import '../styles/Login.css';

export default function Login({ onLogin }) {
  const [id, setId] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    // Demo: any non-empty creds work
    setTimeout(() => {
      if (id && pwd) {
        onLogin({ id, role: 'commander' });
      } else {
        setErr('Enter your Operator ID and passphrase.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="login-root">
      <div className="login-glow" />
      <div className="login-card">
        <div className="login-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <polygon points="20,2 36,12 36,28 20,38 4,28 4,12" fill="none" stroke="#22d3ee" strokeWidth="2"/>
            <polygon points="20,8 30,14 30,26 20,32 10,26 10,14" fill="rgba(34,211,238,0.08)" stroke="#22d3ee" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="4" fill="#22d3ee"/>
          </svg>
        </div>
        <h1 className="login-title">RAKSHAK</h1>
        <p className="login-subtitle">Soldier Health &amp; Fatigue Monitoring</p>
        <p className="login-disclaimer">
          ⚠ Prototype — heuristic fatigue estimation, not a clinical tool.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="operator-id">Operator ID</label>
            <input
              id="operator-id"
              type="text"
              placeholder="e.g. CMD-001"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoFocus
            />
          </div>
          <div className="login-field">
            <label htmlFor="passphrase">Passphrase</label>
            <input
              id="passphrase"
              type="password"
              placeholder="••••••••"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
          </div>
          {err && <p className="login-error">{err}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Access System'}
          </button>
        </form>
        <p className="login-version">v0.1.0 — SIH Software Prototype</p>
      </div>
    </div>
  );
}

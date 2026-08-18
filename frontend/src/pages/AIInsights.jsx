import React, { useEffect, useState, useCallback } from 'react';
import { Cpu, AlertTriangle, CheckCircle2, ShieldAlert, Info, ArrowRight } from 'lucide-react';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';

export default function AIInsights() {
  const [soldiers, setSoldiers] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const generateInsights = useCallback((soldiersList) => {
    const out = [];

    for (const s of soldiersList) {
      const fa = s.latest_fatigue;
      if (!fa) continue;
      const score = fa.fatigue_score ?? 0;
      const cat = fa.risk_category ?? 'NORMAL';
      const c = fa.contributors ?? {};

      const sortedContribs = Object.entries(c).sort(([, a], [, b]) => b - a);
      const [topKey] = sortedContribs[0] || ['hr_deviation', 0];

      let explanationText = '';
      if (topKey === 'hr_deviation') {
        explanationText = `Fatigue risk is driven primarily due to increased heart-rate deviation above ${s.name}'s personal baseline.`;
      } else if (topKey === 'hrv_deterioration') {
        explanationText = `Fatigue risk is driven primarily by reduced parasympathetic HRV (RMSSD) tone relative to personal baseline.`;
      } else if (topKey === 'temperature_trend') {
        explanationText = `Fatigue risk is driven primarily by an upward skin temperature slope indicating heat accumulation.`;
      } else if (topKey === 'activity_load') {
        explanationText = `Fatigue risk is driven primarily by continuous physical exertion load.`;
      }

      if (cat === 'CRITICAL') {
        out.push({
          soldier: s,
          severity: 'critical',
          title: `CRITICAL Fatigue Warning — ${s.name}`,
          score,
          contributors: c,
          body: `${explanationText} Overall fatigue score is ${score.toFixed(0)}/100 (Critical threshold crossed).`,
          action: 'Operational consideration: immediate rest rotation and tactical recovery assessment.',
        });
      } else if (cat === 'HIGH') {
        out.push({
          soldier: s,
          severity: 'high',
          title: `HIGH Fatigue Alert — ${s.name}`,
          score,
          contributors: c,
          body: `${explanationText} Overall fatigue score is ${score.toFixed(0)}/100.`,
          action: 'Operational consideration: review soldier for rest/recovery break.',
        });
      } else if (cat === 'ELEVATED') {
        out.push({
          soldier: s,
          severity: 'elevated',
          title: `ELEVATED Fatigue Warning — ${s.name}`,
          score,
          contributors: c,
          body: `${explanationText} Overall fatigue score is ${score.toFixed(0)}/100. Early fatigue markers detected.`,
          action: 'Operational consideration: monitor personnel closely during next patrol phase.',
        });
      }

      if (!fa.baseline_valid) {
        out.push({
          soldier: s,
          severity: 'info',
          title: `Baseline Calibration — ${s.name}`,
          score: 0,
          contributors: {},
          body: `Personal physiological baseline is currently calibrating. Risk engine is utilizing population fallback thresholds.`,
          action: null,
        });
      }
    }

    if (out.length === 0) {
      out.push({
        soldier: null,
        severity: 'info',
        title: 'All Monitored Personnel Operating Within Nominal Parameters',
        score: 0,
        contributors: {},
        body: 'No elevated fatigue indicators or physiological anomalies detected across monitored squad personnel.',
        action: null,
      });
    }

    return out;
  }, []);

  const load = useCallback(async () => {
    try {
      const sol = await api.soldiers.list().catch(() => []);
      const detailed = await Promise.all(
        sol.map((s) =>
          api.soldiers.fatigue(s.id)
            .then((fa) => ({ ...s, latest_fatigue: fa }))
            .catch(() => ({ ...s, latest_fatigue: null }))
        )
      );
      setSoldiers(detailed);
      setInsights(generateInsights(detailed));
    } finally {
      setLoading(false);
    }
  }, [generateInsights]);

  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [load]);

  const cardStyle = {
    critical: { bg: 'var(--critical-bg)', border: 'var(--critical-border)', text: 'var(--critical)' },
    high:     { bg: 'var(--high-bg)',     border: 'var(--high-border)',     text: 'var(--high)' },
    elevated: { bg: 'var(--elevated-bg)', border: 'var(--elevated-border)', text: 'var(--elevated)' },
    info:     { bg: 'var(--bg-main)',     border: 'var(--border)',          text: 'var(--navy-dark)' },
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">AI &amp; Heuristic Insights Engine</h1>
          <p className="page-subtitle">Transparent explainability breakdown &amp; tactical operational recommendations</p>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--ok)', fontWeight: 600 }}>● Live Model Stream</span>
      </div>

      {/* Model Transparency Disclaimer Card */}
      <div className="card" style={{ background: 'var(--saffron-light)', borderColor: 'var(--saffron-border)', fontSize: '0.82rem', color: 'var(--navy-dark)', lineHeight: 1.5 }}>
        ℹ <strong>TRANSPARENT HEURISTIC MODEL:</strong> RAKSHAK utilizes a rule-based heuristic fatigue risk engine combining HR deviation, HRV (RMSSD) deterioration, physical activity load, and skin temperature slope against personalized baseline estimates. This is an SIH software prototype for command operational decision support and is NOT a medical diagnostic tool.
      </div>

      {loading ? (
        <div className="state-center"><div className="spinner-ring" /><span>Evaluating fatigue models…</span></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {insights.map((ins, i) => {
            const st = cardStyle[ins.severity] ?? cardStyle.info;
            const c = ins.contributors || {};
            return (
              <div
                key={i}
                className="card"
                style={{
                  background: st.bg,
                  borderColor: st.border,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={18} color={st.text} />
                    <span style={{ fontWeight: 800, color: st.text, fontSize: '1.05rem' }}>{ins.title}</span>
                  </div>
                  {ins.soldier && (
                    <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {ins.soldier.soldier_uid} · {ins.soldier.call_sign}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '0.85rem' }}>
                  {ins.body}
                </p>

                {/* Contributor Breakdown Bars */}
                {Object.keys(c).length > 0 && (
                  <div style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: 'var(--r-md)', marginBottom: '0.85rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.6rem' }}>
                      Contributor Breakdown (Why Fatigue Score Changed)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        { label: 'HR Deviation', key: 'hr_deviation', val: c.hr_deviation ?? 0 },
                        { label: 'HRV Deterioration', key: 'hrv_deterioration', val: c.hrv_deterioration ?? 0 },
                        { label: 'Activity Load', key: 'activity_load', val: c.activity_load ?? 0 },
                        { label: 'Temp Trend', key: 'temperature_trend', val: c.temperature_trend ?? 0 },
                      ].map((item) => (
                        <div key={item.key} style={{ fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            <span>{item.label}</span>
                            <span className="mono" style={{ fontWeight: 700 }}>{(item.val * 100).toFixed(0)}%</span>
                          </div>
                          <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, item.val * 100)}%`, height: '100%', background: st.text, borderRadius: '3px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ins.action && (
                  <div
                    style={{
                      padding: '0.45rem 0.85rem',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--navy-dark)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <ArrowRight size={14} color="var(--saffron)" />
                    <span>{ins.action}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contributor Table */}
      {soldiers.length > 0 && (
        <div className="table-container">
          <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem' }}>
            Squad Personnel Contributor Matrix
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>UID</th>
                <th>Name</th>
                <th>Rank</th>
                <th>Fatigue</th>
                <th>Risk Category</th>
                <th>HR Deviation %</th>
                <th>HRV Deterioration %</th>
                <th>Baseline Status</th>
              </tr>
            </thead>
            <tbody>
              {soldiers.map((s) => {
                const fa = s.latest_fatigue;
                const cat = fa?.risk_category ?? 'NORMAL';
                const c = fa?.contributors ?? {};
                return (
                  <tr key={s.id}>
                    <td className="mono text-saffron" style={{ fontWeight: 700 }}>{s.soldier_uid}</td>
                    <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>{s.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.rank}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{fa?.fatigue_score?.toFixed(1) ?? '0.0'}</td>
                    <td>
                      <RiskBadge level={cat} />
                    </td>
                    <td className="mono">
                      {c.hr_deviation != null ? `${(c.hr_deviation * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="mono">
                      {c.hrv_deterioration != null ? `${(c.hrv_deterioration * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: fa?.baseline_valid ? 'var(--ok)' : 'var(--text-muted)' }}>
                      {fa?.baseline_valid ? '✓ Calibrated' : '⟳ Calibrating'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

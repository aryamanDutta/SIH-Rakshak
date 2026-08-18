import React from 'react';

/**
 * RAKSHAK Logo — uses the official shield emblem image.
 * In sidebar: shows icon + wordmark (or just icon when collapsed).
 * On login: shows larger version.
 */
export default function RakshakLogo({ collapsed = false, size = 'normal' }) {
  const imgSize = size === 'large' ? 72 : size === 'small' ? 30 : 38;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', userSelect: 'none' }}>
      {/* Official shield logo image */}
      <img
        src="/rakshak-logo.png"
        alt="RAKSHAK"
        style={{
          width: imgSize,
          height: imgSize,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />

      {/* Wordmark (hidden when sidebar collapsed) */}
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 900,
            fontSize: size === 'large' ? '1.6rem' : size === 'small' ? '1rem' : '1.25rem',
            letterSpacing: '0.12em',
            color: '#1E293B',
            lineHeight: 1,
          }}>
            RAKSHAK
          </span>
          <span style={{
            fontSize: size === 'large' ? '0.7rem' : '0.58rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#94A3B8',
            marginTop: '0.2rem',
          }}>
            Soldier Health & Fatigue
          </span>
        </div>
      )}
    </div>
  );
}

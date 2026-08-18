import React from 'react';
import { Link } from 'react-router-dom';

/**
 * RAKSHAK Logo — uses the official shield emblem image.
 * In sidebar: shows icon + wordmark (or just icon when collapsed).
 * Clicking it navigates to /dashboard when clickable is true.
 */
export default function RakshakLogo({ collapsed = false, size = 'normal', clickable = true }) {
  const imgSize = size === 'large' ? 72 : size === 'small' ? 30 : 38;

  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', userSelect: 'none', cursor: clickable ? 'pointer' : 'default' }}>
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
            Soldier Health &amp; Fatigue
          </span>
        </div>
      )}
    </div>
  );

  if (clickable) {
    return (
      <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex' }}>
        {content}
      </Link>
    );
  }

  return content;
}


/**
 * Shared utility component: Risk/severity badge
 */
export default function RiskBadge({ level }) {
  const map = {
    normal:   'badge-normal',
    info:     'badge-normal',
    elevated: 'badge-elevated',
    high:     'badge-high',
    critical: 'badge-critical',
  };
  const cls = map[level?.toLowerCase()] ?? 'badge-normal';
  return (
    <span className={`badge ${cls}`}>
      <span className={`risk-dot ${level?.toLowerCase() ?? 'normal'}`} style={{width:6,height:6}} />
      {level ?? 'NORMAL'}
    </span>
  );
}

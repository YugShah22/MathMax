'use client';

/** Single analytics stat card. */
export default function StatCard({ label, value, unit, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, fontFamily: "'JetBrains Mono',monospace", color }}>
        {value}
        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(245,245,255,0.3)', marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}

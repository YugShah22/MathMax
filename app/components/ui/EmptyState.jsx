'use client';

/** Reusable empty-state block. */
export default function EmptyState({ icon, text }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 10, padding: '60px 24px',
      color: 'rgba(245,245,255,0.2)', fontSize: '0.88rem',
      gridColumn: '1 / -1',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(245,245,255,0.2)', marginBottom: 4,
      }}>{icon}</div>
      {text}
    </div>
  );
}

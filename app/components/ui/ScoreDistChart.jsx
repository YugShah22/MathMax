'use client';

const RANGES = [
  { label: '90–100', test: s => s >= 90,              color: '#10b981' },
  { label: '75–89',  test: s => s >= 75 && s < 90,   color: '#6d28d9' },
  { label: '60–74',  test: s => s >= 60 && s < 75,   color: '#0ea5e9' },
  { label: '40–59',  test: s => s >= 40 && s < 60,   color: '#f59e0b' },
  { label: '0–39',   test: s => s < 40,               color: '#ef4444' },
];

/** Horizontal bar chart for score distribution. Pass array of numeric scores. */
export default function ScoreDistChart({ scores }) {
  const dist = RANGES.map(r => ({ ...r, count: scores.filter(r.test).length }));
  const max  = Math.max(...dist.map(d => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
      {dist.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.74rem', color: 'rgba(245,245,255,0.35)', width: 52, flexShrink: 0 }}>
            {d.label}
          </span>
          <div style={{ flex: 1, height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ width: `${(d.count / max) * 100}%`, height: '100%', borderRadius: 99, background: d.color, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', color: 'rgba(245,245,255,0.3)', width: 20, textAlign: 'right' }}>
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

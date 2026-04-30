'use client';
import { scoreColor } from '@/app/lib/deadlineUtils';

/**
 * SVG line chart for score trend.
 * Props: data — [{ label, score }]
 */
export default function ScoreTrend({ data }) {
  if (!data || data.length < 2) return null;
  const W = 520, H = 130, PAD = 20;
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - 2 * PAD));
  const minS = Math.min(...data.map(d => d.score)) - 5;
  const maxS = Math.max(...data.map(d => d.score)) + 5;
  const ys   = data.map(d => H - PAD - ((d.score - minS) / (maxS - minS)) * (H - 2 * PAD));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Score trend
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* Fill area */}
          <path d={`${path} L${xs[xs.length-1].toFixed(1)},${H-PAD} L${xs[0].toFixed(1)},${H-PAD} Z`} fill="url(#trendGrad)"/>
          {/* Line */}
          <path d={path} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
          {/* Dots + labels */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={ys[i]} r="4" fill={scoreColor(d.score)} stroke="#07060f" strokeWidth="2"/>
              <text x={xs[i]} y={ys[i] - 9} textAnchor="middle" fontSize="9" fill="rgba(245,245,255,0.5)">{d.score}</text>
              <text x={xs[i]} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(245,245,255,0.25)">{d.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

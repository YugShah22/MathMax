'use client';

const CARDS = [
  {
    key: 'results',
    title: 'View results',
    desc: 'See AI-graded scores, question-wise feedback, and your submission history.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14, padding: 22,
  cursor: 'pointer', textAlign: 'left',
  fontFamily: "'Inter',sans-serif",
  display: 'flex', flexDirection: 'column', gap: 8,
  transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
  width: '100%', maxWidth: 320,
};

export default function HomeCards({ onNavigate }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
      {CARDS.map(c => (
        <button key={c.key} style={CARD_STYLE} onClick={() => onNavigate(c.key)}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(109,40,217,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', marginBottom: 4,
          }}>
            {c.icon}
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f5f5ff' }}>{c.title}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.35)', lineHeight: 1.5 }}>{c.desc}</div>
        </button>
      ))}
    </div>
  );
}

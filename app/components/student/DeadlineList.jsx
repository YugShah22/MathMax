'use client';
import { DeadlineBadge } from '@/app/components/ui/Badge';
import { formatDeadline } from '@/app/lib/deadlineUtils';

const ROW = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '13px 18px', borderRadius: 11,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
  cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', gap: 12,
};

/** Upcoming deadline rows; clicking one pre-fills the QP code in UploadSheetForm. */
export default function DeadlineList({ deadlines, onSelect }) {
  if (!deadlines.length) return null;
  return (
    <div>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Upcoming deadlines
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {deadlines.map((d, i) => (
          <div key={i} style={ROW}
            onClick={() => onSelect(d.code)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(109,40,217,0.25)'; e.currentTarget.style.background = 'rgba(109,40,217,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.paper}</div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(245,245,255,0.35)', marginTop: 2 }}>{d.subject} · {formatDeadline(d.deadline)}</div>
            </div>
            <DeadlineBadge deadline={d.deadline} />
          </div>
        ))}
      </div>
    </div>
  );
}

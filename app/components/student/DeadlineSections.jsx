'use client';
import { useState, useEffect } from 'react';
import { dlStatus, formatDeadline } from '@/app/lib/deadlineUtils';
import { Badge } from '@/app/components/ui/Badge';

const ROW = (extra = {}) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '13px 18px', borderRadius: 11,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
  cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', gap: 12,
  ...extra,
});

const SECTION_TITLE = {
  fontSize: '0.78rem', fontWeight: 700,
  color: 'rgba(245,245,255,0.3)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
};

const LIST = { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 };

/**
 * Renders two sections:
 *  • Upcoming — deadlines still open → click to upload directly
 *  • Past Due  — deadlines that have closed (read-only, no upload)
 *
 * Uses useEffect so date-checks run client-side only (avoids hydration mismatch).
 */
export default function DeadlineSections({ deadlines, onUpload }) {
  const [upcoming, setUpcoming] = useState([]);
  const [pastDue,  setPastDue]  = useState([]);

  useEffect(() => {
    const open = [], closed = [];
    deadlines.forEach(d => {
      (dlStatus(d.deadline)?.closed ? closed : open).push(d);
    });
    setUpcoming(open);
    setPastDue(closed);
  }, [deadlines]);

  if (!upcoming.length && !pastDue.length) return null;

  return (
    <>
      {/* ── UPCOMING ── */}
      {upcoming.length > 0 && (
        <div>
          <div style={SECTION_TITLE}>Upcoming deadlines</div>
          <div style={LIST}>
            {upcoming.map((d, i) => {
              const s = dlStatus(d.deadline);
              return (
                <div key={i} style={ROW()}
                  onClick={() => onUpload(d)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(109,40,217,0.3)'; e.currentTarget.style.background = 'rgba(109,40,217,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.paper}</div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(245,245,255,0.35)', marginTop: 2 }}>{d.subject} · {formatDeadline(d.deadline)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {s && <Badge label={s.label} color={s.color} bg={s.bg} border={s.border} />}
                    <span style={{ fontSize: '0.75rem', color: 'rgba(167,139,250,0.7)', fontWeight: 600 }}>Upload →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PAST DUE ── */}
      {pastDue.length > 0 && (
        <div>
          <div style={SECTION_TITLE}>Past due</div>
          <div style={LIST}>
            {pastDue.map((d, i) => (
              <div key={i} style={ROW({ cursor: 'default', opacity: 0.6 })}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.paper}</div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(245,245,255,0.35)', marginTop: 2 }}>{d.subject} · {formatDeadline(d.deadline)}</div>
                </div>
                <Badge label="Closed" color="#ef4444" bg="rgba(239,68,68,0.09)" border="rgba(239,68,68,0.22)" />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

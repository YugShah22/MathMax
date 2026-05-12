'use client';
import { useState, useEffect } from 'react';
import { UPCOMING_DEADLINES, RESULTS } from '@/app/lib/mockData';
import { dlStatus } from '@/app/lib/deadlineUtils';
import styles from '@/app/components/shared/dashboard.module.css';

const TABS = ['Forthcoming', 'Past due', 'Completed'];

const SUBJECT_COLORS = {
  Algebra: '#7c3aed', Calculus: '#0ea5e9', Geometry: '#ec4899',
  default: '#6d28d9',
};

function subjectColor(subject) {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.default;
}

/** Format "5 May · Tuesday" */
function dateHeader(isoStr) {
  const d = new Date(isoStr);
  return {
    short: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    ts: d.getTime(),
  };
}

/** Format "Due at 11:59 pm" */
function dueTime(isoStr) {
  return `Due at ${new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Group an array of deadline items by their date string. */
function groupByDate(items) {
  const map = new Map();
  items.forEach(item => {
    const h = dateHeader(item.deadline);
    const key = h.short;
    if (!map.has(key)) map.set(key, { ...h, items: [] });
    map.get(key).items.push(item);
  });
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

function AssignmentCard({ item, onClick, completed }) {
  const color = subjectColor(item.subject);
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
        marginBottom: 8,
      }}
      onMouseEnter={e => {
        if (!onClick) return;
        e.currentTarget.style.borderColor = `${color}44`;
        e.currentTarget.style.background = `${color}0d`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      }}
    >
      {/* Subject avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}22`, border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', fontWeight: 800, color,
      }}>
        {(item.subject || item.paper || '?')[0]}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.9rem', fontWeight: 700, color: completed ? 'rgba(245,245,255,0.5)' : '#f5f5ff',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: completed ? 'line-through' : 'none',
        }}>
          {item.paper}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'rgba(245,245,255,0.35)', marginTop: 3 }}>
          {item.deadline ? dueTime(item.deadline) : item.date ? `Submitted ${item.date}` : ''}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.22)', marginTop: 1 }}>
          {item.subject}
          {item.code && <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono',monospace", color: `${color}99` }}>{item.code}</span>}
        </div>
      </div>

      {/* Score badge for completed */}
      {completed && item.score !== undefined && (
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: '1rem', fontWeight: 900,
          color: item.score >= 85 ? '#10b981' : item.score >= 65 ? '#f59e0b' : '#ef4444',
          flexShrink: 0,
        }}>
          {item.score}<span style={{ fontSize: '0.7rem', color: 'rgba(245,245,255,0.3)', fontWeight: 500 }}>/100</span>
        </div>
      )}

      {/* Arrow for forthcoming */}
      {onClick && !completed && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </div>
  );
}

function DateGroup({ group, onClick, completed }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
      }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f5f5ff' }}>{group.short}</span>
        <span style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.35)', fontWeight: 500 }}>{group.weekday}</span>
      </div>
      {group.items.map((item, i) => (
        <AssignmentCard key={i} item={item} onClick={onClick ? () => onClick(item) : null} completed={completed} />
      ))}
    </div>
  );
}

function FurtherOutDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 24px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(109,40,217,0.25)' }} />
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(109,40,217,0.7)' }}>Further out</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(109,40,217,0.25)' }} />
    </div>
  );
}

function EmptyTab({ label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: '64px 24px', color: 'rgba(245,245,255,0.2)', fontSize: '0.88rem',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      No {label.toLowerCase()} papers
    </div>
  );
}

/**
 * PapersView — full-page Assignments-style view.
 * Props:
 *   onUpload(paper): navigate to direct upload
 *   onResult(result): navigate to result detail
 */
export default function PapersView({ onUpload, onResult }) {
  const [tab, setTab]           = useState('Forthcoming');
  const [forthcoming, setForth] = useState([]);
  const [pastDue, setPast]      = useState([]);

  useEffect(() => {
    const open = [], closed = [];
    UPCOMING_DEADLINES.forEach(d => {
      (dlStatus(d.deadline)?.closed ? closed : open).push(d);
    });
    setForth(open);
    setPast(closed);
  }, []);

  const NOW   = Date.now();
  const WEEK  = 7 * 24 * 3600 * 1000;

  // Split forthcoming into soon (≤7d) and further out (>7d)
  const soon    = groupByDate(forthcoming.filter(d => new Date(d.deadline).getTime() - NOW <= WEEK));
  const further = groupByDate(forthcoming.filter(d => new Date(d.deadline).getTime() - NOW >  WEEK));
  const pastGrp = groupByDate(pastDue);
  const completed = RESULTS; // use results as "completed" submissions

  return (
    <div className={styles.fadeIn}>
      {/* Header */}
      <div className={styles.pageHeader} style={{ marginBottom: 4 }}>
        <div>
          <h1 className={styles.pageTitle}>Papers</h1>
          <p className={styles.pageSubtitle}>Your assignments &amp; submissions</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: tab === t ? 700 : 500,
              fontFamily: "'Inter',sans-serif",
              color: tab === t ? '#f5f5ff' : 'rgba(245,245,255,0.4)',
              borderBottom: tab === t ? '2px solid #7c3aed' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t}
            {t === 'Forthcoming' && forthcoming.length > 0 && (
              <span style={{
                marginLeft: 7, padding: '1px 7px', borderRadius: 99,
                background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.25)',
                fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa',
              }}>{forthcoming.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── FORTHCOMING ── */}
      {tab === 'Forthcoming' && (
        forthcoming.length === 0 ? <EmptyTab label="Forthcoming" /> : (
          <>
            {soon.map((g, i)    => <DateGroup key={i} group={g} onClick={onUpload} />)}
            {further.length > 0 && <FurtherOutDivider />}
            {further.map((g, i) => <DateGroup key={i} group={g} onClick={onUpload} />)}
          </>
        )
      )}

      {/* ── PAST DUE ── */}
      {tab === 'Past due' && (
        pastDue.length === 0 ? <EmptyTab label="Past due" /> : (
          pastGrp.map((g, i) => <DateGroup key={i} group={g} onClick={null} />)
        )
      )}

      {/* ── COMPLETED ── */}
      {tab === 'Completed' && (
        completed.length === 0 ? <EmptyTab label="Completed" /> : (
          <div>
            {completed.map((r, i) => (
              <AssignmentCard
                key={i}
                item={r}
                onClick={() => onResult(r)}
                completed
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

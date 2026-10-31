'use client';
import { useState, useEffect } from 'react';
import { getDeadlines } from '@/app/lib/api';
import { dlStatus } from '@/app/lib/deadlineUtils';
import styles from '@/app/components/shared/dashboard.module.css';

const TABS = ['Forthcoming', 'Past due', 'Submitted'];

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

/** Group an array of papers by their deadline date. */
function groupByDate(items) {
  const map = new Map();
  items.forEach(item => {
    if (!item.deadline) return;
    const h = dateHeader(item.deadline);
    const key = h.short;
    if (!map.has(key)) map.set(key, { ...h, items: [] });
    map.get(key).items.push(item);
  });
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

function scoreColor(s) {
  if (s >= 85) return '#10b981';
  if (s >= 65) return '#f59e0b';
  return '#ef4444';
}

function AssignmentCard({ item, onClick, submitted }) {
  const color = item.subjectColor || '#6d28d9';
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
        opacity: submitted && item.submissionStatus === 'graded' ? 0.8 : 1,
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
        {(item.subject || item.title || '?')[0]}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.9rem', fontWeight: 700,
          color: submitted ? 'rgba(245,245,255,0.6)' : '#f5f5ff',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: submitted && item.submissionStatus === 'graded' ? 'none': 'none',
        }}>
          {item.title}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'rgba(245,245,255,0.35)', marginTop: 3 }}>
          {submitted
            ? `Submitted · ${item.submissionStatus === 'graded' ? 'Graded' : 'Awaiting grading'}`
            : item.deadline ? dueTime(item.deadline) : 'No deadline set'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.22)' }}>{item.subject}</span>
          {item.code && (
            <span style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: '0.68rem',
              color: `${color}99`, background: `${color}15`,
              padding: '1px 6px', borderRadius: 4,
            }}>{item.code}</span>
          )}
        </div>
      </div>

      {/* Score badge for graded */}
      {submitted && item.submissionStatus === 'graded' && item.score !== null && (
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: '1rem', fontWeight: 900,
          color: scoreColor(item.score), flexShrink: 0,
        }}>
          {item.score}<span style={{ fontSize: '0.7rem', color: 'rgba(245,245,255,0.3)', fontWeight: 500 }}>/100</span>
        </div>
      )}

      {/* Upload arrow for forthcoming */}
      {onClick && !submitted && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </div>
  );
}

function DateGroup({ group, onClick, submitted }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f5f5ff' }}>{group.short}</span>
        <span style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.35)', fontWeight: 500 }}>{group.weekday}</span>
      </div>
      {group.items.map((item, i) => (
        <AssignmentCard key={i} item={item} onClick={onClick ? () => onClick(item) : null} submitted={submitted} />
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

function EmptyTab({ label, noEnrollments }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: '64px 24px', color: 'rgba(245,245,255,0.2)', fontSize: '0.88rem',
      textAlign: 'center',
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
      {noEnrollments
        ? 'Join a subject first — go to the Subjects tab and enter your teacher\'s code'
        : `No ${label.toLowerCase()} papers`}
    </div>
  );
}

/**
 * PapersView — full-page Assignments-style view.
 * Fetches live papers from /api/papers/deadlines (only approved enrolled subjects).
 * Props:
 *   onUpload(paper): navigate to direct upload
 *   onResult(result): navigate to result detail
 */
export default function PapersView({ onUpload, onResult, filterSubject }) {
  const [tab, setTab]         = useState('Forthcoming');
  const [papers, setPapers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getDeadlines();
        setPapers(data.papers || []);
      } catch (err) {
        console.error('Failed to load papers:', err);
        setError(err.message || 'Failed to load papers');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className={styles.fadeIn} style={{ color: 'rgba(245,245,255,0.3)', padding: 40, textAlign: 'center' }}>
        Loading papers…
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.fadeIn} style={{ color: '#ef4444', padding: 40, textAlign: 'center' }}>
        Error: {error}
      </div>
    );
  }

  // Apply subject filter if coming from a subject card click
  const visiblePapers = filterSubject
    ? papers.filter(p => p.subjectId === filterSubject.subjectId)
    : papers;

  const NOW  = Date.now();
  const WEEK = 7 * 24 * 3600 * 1000;

  const forthcoming = visiblePapers.filter(p => !p.submitted && p.deadline && new Date(p.deadline) > new Date());
  const pastDue     = visiblePapers.filter(p => !p.submitted && p.deadline && new Date(p.deadline) <= new Date());
  const submitted   = visiblePapers.filter(p => p.submitted);

  const soon    = groupByDate(forthcoming.filter(p => new Date(p.deadline).getTime() - NOW <= WEEK));
  const further = groupByDate(forthcoming.filter(p => new Date(p.deadline).getTime() - NOW >  WEEK));
  const pastGrp = groupByDate(pastDue);

  const noEnrollments = papers.length === 0;
  const counts = { Forthcoming: forthcoming.length, 'Past due': pastDue.length, Submitted: submitted.length };

  return (
    <div className={styles.fadeIn}>
      {/* Header */}
      <div className={styles.pageHeader} style={{ marginBottom: 4 }}>
        <div>
          <h1 className={styles.pageTitle}>Papers</h1>
          {filterSubject ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                color: filterSubject.color || '#a78bfa',
                background: (filterSubject.color || '#7c3aed') + '18',
                border: `1px solid ${(filterSubject.color || '#7c3aed')}30`,
                padding: '2px 10px', borderRadius: 99,
              }}>{filterSubject.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.25)' }}>
                {visiblePapers.length} paper{visiblePapers.length !== 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <p className={styles.pageSubtitle}>All your assignments &amp; submissions</p>
          )}
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
            {counts[t] > 0 && (
              <span style={{
                marginLeft: 7, padding: '1px 7px', borderRadius: 99,
                background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.25)',
                fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa',
              }}>{counts[t]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── FORTHCOMING ── */}
      {tab === 'Forthcoming' && (
        forthcoming.length === 0
          ? <EmptyTab label="Forthcoming" noEnrollments={noEnrollments} />
          : (
            <>
              {soon.map((g, i)    => <DateGroup key={i} group={g} onClick={onUpload} />)}
              {further.length > 0 && <FurtherOutDivider />}
              {further.map((g, i) => <DateGroup key={i} group={g} onClick={onUpload} />)}
            </>
          )
      )}

      {/* ── PAST DUE ── */}
      {tab === 'Past due' && (
        pastDue.length === 0
          ? <EmptyTab label="Past due" noEnrollments={noEnrollments} />
          : pastGrp.map((g, i) => <DateGroup key={i} group={g} onClick={null} />)
      )}

      {/* ── SUBMITTED ── */}
      {tab === 'Submitted' && (
        submitted.length === 0
          ? <EmptyTab label="Submitted" noEnrollments={noEnrollments} />
          : (
            <div>
              {submitted.map((p, i) => (
                <AssignmentCard
                  key={i}
                  item={p}
                  onClick={p.submissionStatus === 'graded' && p.score !== null ? () => onResult({ id: p.id, paper: p.title, subject: p.subject, subjectColor: p.subjectColor, score: p.score, date: '' }) : null}
                  submitted
                />
              ))}
            </div>
          )
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { getAnalytics, exportCSV as exportCsvApi } from '@/app/lib/api';
import { SubjectBadge } from '@/app/components/ui/Badge';
import { GhostButton }  from '@/app/components/ui/Button';
import StatCard          from '@/app/components/ui/StatCard';
import ScoreDistChart    from '@/app/components/ui/ScoreDistChart';
import { scoreColor }    from '@/app/lib/deadlineUtils';
import styles            from '@/app/components/shared/dashboard.module.css';

const DL_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32']; // gold, silver, bronze

function RankBadge({ rank }) {
  const color = rank <= 3 ? RANK_COLORS[rank - 1] : 'rgba(245,245,255,0.2)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 26, height: 26, borderRadius: '50%',
      background: rank <= 3 ? `${color}22` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${color}`,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.7rem', fontWeight: 800,
      color,
      flexShrink: 0,
    }}>
      {rank}
    </span>
  );
}

export default function AnalyticsView({ paper, subject }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await getAnalytics(paper.id || paper._id);
        setData(d);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [paper]);

  const handleExport = async () => {
    try {
      await exportCsvApi(paper.id || paper._id);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  if (loading || !data) {
    return <div className={styles.fadeIn} style={{ color: 'rgba(245,245,255,0.3)', padding: 40, textAlign: 'center' }}>Loading analytics…</div>;
  }

  if (data.totalSubmissions === 0) {
    return (
      <div className={styles.fadeIn}>
        <div className={styles.pageHeader}>
          <div>
            <SubjectBadge name={subject.name} color={subject.color} />
            <h1 className={styles.pageTitle}>Analytics</h1>
            <p className={styles.pageSubtitle}>{paper.title}</p>
          </div>
        </div>
        <div style={{ color: 'rgba(245,245,255,0.3)', padding: 40, textAlign: 'center' }}>No graded submissions yet.</div>
      </div>
    );
  }

  const students = data.students || [];
  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.fadeIn}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <SubjectBadge name={subject.name} color={subject.color} />
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageSubtitle}>{paper.title} · {data.totalSubmissions} submissions</p>
        </div>
        <GhostButton onClick={handleExport} style={{ fontSize: '0.8rem' }}>
          {DL_ICON} Export CSV
        </GhostButton>
      </div>

      {/* Stat cards */}
      <div className={styles.statGrid} style={{ marginBottom: 28 }}>
        <StatCard label="Average"   value={data.avg}     unit="/100" color={data.avg >= 75 ? '#10b981' : data.avg >= 50 ? '#f59e0b' : '#ef4444'} />
        <StatCard label="Pass rate" value={data.passRate} unit="%"    color="#6d28d9" />
        <StatCard label="Highest"   value={data.highest}  unit="/100" color="#10b981" />
        <StatCard label="Lowest"    value={data.lowest}   unit="/100" color="#ef4444" />
      </div>

      {/* Score distribution */}
      <div className={styles.sectionTitle}>Score distribution</div>
      <ScoreDistChart scores={data.scores} />

      {/* Student marks leaderboard */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Student marks — {students.length} student{students.length !== 1 ? 's' : ''}
          </div>
          {students.length > 5 && (
            <input
              className={styles.textInput}
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200, padding: '7px 12px', fontSize: '0.82rem' }}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 90px 120px 56px',
            gap: 12,
            padding: '6px 16px',
            fontSize: '0.68rem', fontWeight: 700,
            color: 'rgba(245,245,255,0.25)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            <span>#</span>
            <span>Student</span>
            <span></span>
            <span>Score bar</span>
            <span style={{ textAlign: 'right' }}>Score</span>
          </div>

          {filtered.length === 0 && (
            <div style={{ color: 'rgba(245,245,255,0.25)', fontSize: '0.84rem', padding: '28px 16px', textAlign: 'center' }}>
              No students match "{search}"
            </div>
          )}

          {filtered.map((s, idx) => {
            const col = scoreColor(s.score);
            const pct = Math.min(100, Math.round((s.score / 100) * 100));
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 90px 120px 56px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '11px 16px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(109,40,217,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(109,40,217,0.18)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                {/* Rank */}
                <RankBadge rank={s.rank} />

                {/* Name */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f5f5ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </div>
                  {s.email && (
                    <div style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.28)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.email}
                    </div>
                  )}
                </div>

                {/* Pass / Fail badge */}
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 999,
                  background: s.score >= 40 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${s.score >= 40 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  color: s.score >= 40 ? '#6ee7b7' : '#fca5a5',
                  justifySelf: 'start',
                }}>
                  {s.score >= 40 ? 'Pass' : 'Fail'}
                </span>

                {/* Score bar */}
                <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 99,
                    background: col,
                    transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                  }} />
                </div>

                {/* Score number */}
                <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.92rem', fontWeight: 800, color: col }}>
                  {s.score}
                  <span style={{ fontSize: '0.65rem', color: 'rgba(245,245,255,0.3)', fontWeight: 400 }}>/100</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { getResults, getDeadlines } from '@/app/lib/api';
import { scoreColor } from '@/app/lib/deadlineUtils';
import ScoreTrend from '@/app/components/student/ScoreTrend';

/* ── helpers ──────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function formatNow() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}
function countdown(deadline) {
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 864e5);
  const h = Math.floor((diff % 864e5) / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 6) return `${Math.floor(d / 7)} week${Math.floor(d / 7) > 1 ? 's' : ''} ago`;
  if (d > 0)  return `${d} day${d > 1 ? 's' : ''} ago`;
  if (h > 0)  return `${h}h ago`;
  return `${m}m ago`;
}

/* ── sub-components ────────────────────────────────── */
function StatCard({ label, value, sub, color, accent }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '18px 20px', flex: 1, minWidth: 120,
      borderTop: `2px solid ${accent || 'rgba(255,255,255,0.07)'}`,
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: color || '#f5f5ff', fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.25)', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function SubjectBar({ name, avg, color }) {
  const c = color || '#6d28d9';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(245,245,255,0.7)' }}>{name}</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8rem', fontWeight: 700, color: scoreColor(avg) }}>
          {avg}<span style={{ color: 'rgba(245,245,255,0.25)', fontWeight: 400, fontSize: '0.7rem' }}>/100</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${avg}%`, background: `linear-gradient(90deg, ${c}aa, ${c})`, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  const isGraded = item.type === 'graded';
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
        <div style={{
          width: 9, height: 9, borderRadius: '50%',
          background: isGraded ? '#10b981' : '#6d28d9',
          boxShadow: isGraded ? '0 0 6px rgba(16,185,129,0.4)' : '0 0 6px rgba(109,40,217,0.4)',
          flexShrink: 0,
        }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#f5f5ff' }}>{item.text}</span>
          {item.score != null && (
            <span style={{
              padding: '1px 8px', borderRadius: 99, fontSize: '0.71rem', fontWeight: 700,
              color: scoreColor(item.score), background: scoreColor(item.score) + '18',
              border: `1px solid ${scoreColor(item.score)}33`,
            }}>{item.score}/100</span>
          )}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.28)', marginTop: 3 }}>{item.time}</div>
      </div>
    </div>
  );
}

function Skeleton({ w = '100%', h = 16, radius = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'rgba(255,255,255,0.06)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

/* ── main component ───────────────────────────────── */
export default function StudentHome({ username = 'Student' }) {
  const [time, setTime]           = useState('');
  const [date, setDate]           = useState('');
  const [cdText, setCd]           = useState('');
  const [nextDeadline, setNext]   = useState(null);

  const [results,  setResults]  = useState([]);
  const [papers,   setPapers]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  // time + fetch
  useEffect(() => {
    setTime(greeting());
    setDate(formatNow());

    async function load() {
      try {
        const [resData, paperData] = await Promise.all([
          getResults().catch(() => ({ results: [] })),
          getDeadlines().catch(() => ({ papers: [] })),
        ]);
        setResults(resData.results || []);
        const allPapers = paperData.papers || [];
        setPapers(allPapers);

        // next deadline
        const open = allPapers
          .filter(p => !p.submitted && p.deadline && new Date(p.deadline) > new Date())
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        if (open[0]) {
          setNext(open[0]);
          setCd(countdown(open[0].deadline));
          const tick = setInterval(() => setCd(countdown(open[0].deadline)), 60000);
          return () => clearInterval(tick);
        }
      } catch (e) {
        console.error('StudentHome load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── derived stats ──────────────────────────────── */
  const graded      = results.filter(r => r.score !== null);
  const totalSubmit = papers.filter(p => p.submitted).length; // single source of truth — avoids double-counting graded papers
  const avgScore    = graded.length
    ? Math.round(graded.reduce((a, r) => a + r.score, 0) / graded.length)
    : null;
  const bestScore   = graded.length ? Math.max(...graded.map(r => r.score)) : null;

  // improvement: last graded vs first graded (chronological order)
  const chronoGraded = [...graded].sort((a, b) => new Date(a.date) - new Date(b.date));
  const improvement = chronoGraded.length >= 2
    ? chronoGraded[chronoGraded.length - 1].score - chronoGraded[0].score
    : null;

  // subject breakdown: avg score per subject
  const subjectMap = {};
  graded.forEach(r => {
    if (!subjectMap[r.subject]) subjectMap[r.subject] = { scores: [], color: r.subjectColor };
    subjectMap[r.subject].scores.push(r.score);
  });
  const subjectBars = Object.entries(subjectMap).map(([name, { scores, color }]) => ({
    name, color,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));

  // score trend: each graded result as a data point (most recent first → reverse for trend)
  const scoreTrend = [...graded]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r, i) => ({ label: r.paper.slice(0, 12), score: r.score, index: i + 1 }));

  // activity feed: combine graded results + pending submissions
  const activity = [
    ...graded.map(r => ({
      type: 'graded',
      text: `${r.paper} graded`,
      score: r.score,
      time: timeAgo(r.date || r.submittedAt || new Date()),
      ts: new Date(r.date || r.submittedAt),
    })),
    ...papers
      .filter(p => p.submitted && p.submissionStatus !== 'graded')
      .map(p => ({
        type: 'submitted',
        text: `Submitted ${p.title}`,
        score: null,
        time: 'recently',
        ts: new Date(),
      })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 6);

  const noData = !loading && graded.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* pulse keyframes */}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* ── GREETING ── */}
      <div style={{
        background: 'linear-gradient(120deg, rgba(109,40,217,0.1) 0%, rgba(14,165,233,0.06) 100%)',
        border: '1px solid rgba(109,40,217,0.15)', borderRadius: 16,
        padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(167,139,250,0.7)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>
            {date}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f5f5ff', lineHeight: 1.2 }}>
            {time}, {username}
          </div>
          {improvement !== null && improvement !== 0 && (
            <div style={{ fontSize: '0.8rem', color: improvement > 0 ? '#10b981' : '#ef4444', marginTop: 6, fontWeight: 600 }}>
              {improvement > 0 ? '↑' : '↓'} {Math.abs(improvement)} pts since your first submission
            </div>
          )}
          {noData && (
            <div style={{ fontSize: '0.8rem', color: 'rgba(245,245,255,0.35)', marginTop: 6 }}>
              Submit your first paper to see progress here
            </div>
          )}
        </div>
        {nextDeadline && cdText && (
          <div style={{
            background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.25)',
            borderRadius: 12, padding: '14px 20px', textAlign: 'center', minWidth: 140,
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(167,139,250,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Next due</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa', fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{cdText}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.35)', marginTop: 4, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextDeadline.title}
            </div>
          </div>
        )}
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, minWidth: 120, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
              <Skeleton w="60%" h={10} />
              <div style={{ marginTop: 10 }}><Skeleton w="40%" h={32} radius={4} /></div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Submitted"
              value={totalSubmit || '—'}
              sub="total papers"
              accent="rgba(109,40,217,0.5)"
            />
            <StatCard
              label="Average"
              value={avgScore !== null ? avgScore : '—'}
              sub={avgScore !== null ? 'across all papers' : 'no grades yet'}
              accent="rgba(14,165,233,0.5)"
              color={avgScore !== null ? scoreColor(avgScore) : undefined}
            />
            <StatCard
              label="Best score"
              value={bestScore !== null ? bestScore : '—'}
              sub={bestScore !== null ? 'personal record' : 'no grades yet'}
              accent="rgba(16,185,129,0.5)"
              color="#10b981"
            />
            <StatCard
              label="Improvement"
              value={improvement !== null ? (improvement >= 0 ? `+${improvement}` : improvement) : '—'}
              sub={improvement !== null ? 'pts from first to last' : 'need ≥2 results'}
              accent={improvement !== null && improvement >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}
              color={improvement !== null && improvement >= 0 ? '#10b981' : '#ef4444'}
            />
          </>
        )}
      </div>

      {/* ── TREND + SUBJECT BREAKDOWN ── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
          {/* Score trend chart */}
          {scoreTrend.length >= 1 ? (
            <ScoreTrend data={scoreTrend} />
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '40px 24px', textAlign: 'center',
              color: 'rgba(245,245,255,0.2)', fontSize: '0.85rem',
            }}>
              Score trend will appear after your first graded submission
            </div>
          )}

          {/* Subject breakdown */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '20px 20px',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>
              By subject
            </div>
            {subjectBars.length > 0 ? (
              subjectBars.map(s => <SubjectBar key={s.name} name={s.name} avg={s.avg} color={s.color} />)
            ) : (
              <div style={{ color: 'rgba(245,245,255,0.2)', fontSize: '0.82rem' }}>
                No graded papers yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RECENT ACTIVITY ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '20px 24px',
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
          Recent activity
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1,2,3].map(i => <Skeleton key={i} h={12} />)}
          </div>
        ) : activity.length > 0 ? (
          <div style={{ position: 'relative', paddingLeft: 0 }}>
            {activity.map((item, i) => <ActivityItem key={i} item={item} />)}
          </div>
        ) : (
          <div style={{ color: 'rgba(245,245,255,0.2)', fontSize: '0.85rem', padding: '20px 0' }}>
            No activity yet — submit a paper to get started
          </div>
        )}
      </div>

    </div>
  );
}

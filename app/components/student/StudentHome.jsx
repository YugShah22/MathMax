'use client';
import { useState, useEffect } from 'react';
import { RESULTS, UPCOMING_DEADLINES, SCORE_TREND } from '@/app/lib/mockData';
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
function subjectAvg(subject) {
  const rs = RESULTS.filter(r => r.subject === subject);
  if (!rs.length) return 0;
  return Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length);
}

const SUBJECT_COLORS = { Algebra: '#7c3aed', Calculus: '#0ea5e9', Geometry: '#ec4899' };
const SUBJECTS = Object.keys(SUBJECT_COLORS);

const ACTIVITY = [
  { type: 'graded',    text: 'Algebra Midterm graded',       score: 87,  time: '2 days ago' },
  { type: 'submitted', text: 'Submitted Calculus Integration',score: null,time: '3 days ago' },
  { type: 'graded',    text: 'Geometry Chapter 5 graded',    score: 92,  time: '5 days ago' },
  { type: 'submitted', text: 'Submitted Algebra Unit 3 Quiz', score: null,time: '6 days ago' },
  { type: 'graded',    text: 'Algebra Unit 3 Quiz graded',   score: 81,  time: '1 week ago' },
];

/* ── sub-components ───────────────────────────────── */
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

function SubjectBar({ name, avg }) {
  const color = SUBJECT_COLORS[name] || '#6d28d9';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(245,245,255,0.7)' }}>{name}</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8rem', fontWeight: 700, color: scoreColor(avg) }}>{avg}<span style={{ color: 'rgba(245,245,255,0.25)', fontWeight: 400, fontSize: '0.7rem' }}>/100</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${avg}%`, background: `linear-gradient(90deg, ${color}aa, ${color})`, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  const isGraded = item.type === 'graded';
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 16, position: 'relative' }}>
      {/* dot + line */}
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

/* ── main component ───────────────────────────────── */
export default function StudentHome({ username = 'Student' }) {
  const [time, setTime]           = useState('');
  const [date, setDate]           = useState('');
  const [nextDeadline, setNext]   = useState(null);
  const [cdText, setCd]           = useState('');

  // client-only time-dependent state
  useEffect(() => {
    setTime(greeting());
    setDate(formatNow());

    // find next open deadline
    const open = UPCOMING_DEADLINES
      .filter(d => new Date(d.deadline) > new Date())
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    if (open[0]) {
      setNext(open[0]);
      setCd(countdown(open[0].deadline));
    }

    // live countdown tick
    const tick = setInterval(() => {
      if (open[0]) setCd(countdown(open[0].deadline));
    }, 60000);
    return () => clearInterval(tick);
  }, []);

  const totalSubmissions = RESULTS.length;
  const avgScore         = Math.round(RESULTS.reduce((a, r) => a + r.score, 0) / (RESULTS.length || 1));
  const bestScore        = Math.max(...RESULTS.map(r => r.score));
  const improvement      = SCORE_TREND.length >= 2
    ? SCORE_TREND[SCORE_TREND.length - 1].score - SCORE_TREND[0].score
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

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
          {improvement !== 0 && (
            <div style={{ fontSize: '0.8rem', color: improvement > 0 ? '#10b981' : '#ef4444', marginTop: 6, fontWeight: 600 }}>
              {improvement > 0 ? '↑' : '↓'} {Math.abs(improvement)} pts since your first submission
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
              {nextDeadline.paper}
            </div>
          </div>
        )}
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Submitted"    value={totalSubmissions}  sub="total papers"        accent="rgba(109,40,217,0.5)" />
        <StatCard label="Average"      value={avgScore}           sub="across all papers"   accent="rgba(14,165,233,0.5)"  color={scoreColor(avgScore)} />
        <StatCard label="Best score"   value={bestScore}          sub="personal record"     accent="rgba(16,185,129,0.5)"  color="#10b981" />
        <StatCard label="Improvement"  value={improvement > 0 ? `+${improvement}` : improvement} sub="pts from first to last" accent={improvement >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'} color={improvement >= 0 ? '#10b981' : '#ef4444'} />
      </div>

      {/* ── TREND + SUBJECT BREAKDOWN ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        {/* Score trend */}
        <ScoreTrend data={SCORE_TREND} />

        {/* Subject breakdown */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '20px 20px',
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>
            By subject
          </div>
          {SUBJECTS.map(s => <SubjectBar key={s} name={s} avg={subjectAvg(s)} />)}
        </div>
      </div>

      {/* ── RECENT ACTIVITY ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '20px 24px',
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
          Recent activity
        </div>
        {/* Vertical timeline line */}
        <div style={{ position: 'relative', paddingLeft: 0 }}>
          {ACTIVITY.map((item, i) => <ActivityItem key={i} item={item} />)}
        </div>
      </div>

    </div>
  );
}

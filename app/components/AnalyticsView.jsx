'use client';
import { SEEDED_SCORES } from '@/app/lib/mockData';
import { SubjectBadge } from '@/app/components/ui/Badge';
import { GhostButton }  from '@/app/components/ui/Button';
import StatCard          from '@/app/components/ui/StatCard';
import ScoreDistChart    from '@/app/components/ui/ScoreDistChart';
import { exportCSV }     from '@/app/lib/exportUtils';
import styles            from '@/app/components/dashboard.module.css';

const DL_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

export default function AnalyticsView({ paper, subject }) {
  const scores  = Array.from({ length: paper.submissions }, (_, i) => SEEDED_SCORES[i % SEEDED_SCORES.length]);
  const avg     = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const pass    = scores.filter(s => s >= 40).length;
  const passRate= Math.round((pass / scores.length) * 100);

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <SubjectBadge name={subject.name} color={subject.color} />
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageSubtitle}>{paper.title} · {paper.submissions} submissions</p>
        </div>
        <GhostButton onClick={() => exportCSV(paper, subject)} style={{ fontSize: '0.8rem' }}>
          {DL_ICON} Export CSV
        </GhostButton>
      </div>

      <div className={styles.statGrid} style={{ marginBottom: 28 }}>
        <StatCard label="Average"   value={avg}      unit="/100" color={avg >= 75 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444'} />
        <StatCard label="Pass rate" value={passRate} unit="%"    color="#6d28d9" />
        <StatCard label="Highest"   value={Math.max(...scores)}  unit="/100" color="#10b981" />
        <StatCard label="Lowest"    value={Math.min(...scores)}  unit="/100" color="#ef4444" />
      </div>

      <div className={styles.sectionTitle}>Score distribution</div>
      <ScoreDistChart scores={scores} />
    </div>
  );
}

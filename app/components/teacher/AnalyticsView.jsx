'use client';
import { useState, useEffect } from 'react';
import { getAnalytics, exportCSV as exportCsvApi } from '@/app/lib/api';
import { SubjectBadge } from '@/app/components/ui/Badge';
import { GhostButton }  from '@/app/components/ui/Button';
import StatCard          from '@/app/components/ui/StatCard';
import ScoreDistChart    from '@/app/components/ui/ScoreDistChart';
import styles            from '@/app/components/shared/dashboard.module.css';

const DL_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function AnalyticsView({ paper, subject }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className={styles.fadeIn}>
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

      <div className={styles.statGrid} style={{ marginBottom: 28 }}>
        <StatCard label="Average"   value={data.avg}     unit="/100" color={data.avg >= 75 ? '#10b981' : data.avg >= 50 ? '#f59e0b' : '#ef4444'} />
        <StatCard label="Pass rate" value={data.passRate} unit="%"    color="#6d28d9" />
        <StatCard label="Highest"   value={data.highest}  unit="/100" color="#10b981" />
        <StatCard label="Lowest"    value={data.lowest}   unit="/100" color="#ef4444" />
      </div>

      <div className={styles.sectionTitle}>Score distribution</div>
      <ScoreDistChart scores={data.scores} />
    </div>
  );
}

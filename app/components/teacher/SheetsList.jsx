'use client';
import { useState, useEffect } from 'react';
import { getSubmissions, exportCSV as exportCsvApi } from '@/app/lib/api';
import { DeadlineBadge } from '@/app/components/ui/Badge';
import { GhostButton } from '@/app/components/ui/Button';
import { scoreColor } from '@/app/lib/deadlineUtils';
import EmptyState from '@/app/components/ui/EmptyState';
import styles from '@/app/components/shared/dashboard.module.css';

const DL_ICON = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const SHEET_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

export default function SheetsList({ paper, subject, onViewSheet }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSubmissions(paper.id || paper._id);
        setSubmissions(data.submissions || []);
      } catch (err) {
        console.error('Failed to load submissions:', err);
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

  if (loading) {
    return <div className={styles.fadeIn} style={{ color: 'rgba(245,245,255,0.3)', padding: 40, textAlign: 'center' }}>Loading submissions…</div>;
  }

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Corrected Sheets</h1>
          <p className={styles.pageSubtitle}>{paper.title} · {subject?.name} · {submissions.length} submissions</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {paper.deadline && <DeadlineBadge deadline={paper.deadline} />}
          <GhostButton onClick={handleExport} style={{ fontSize: '0.8rem' }}>
            {DL_ICON} Export CSV
          </GhostButton>
        </div>
      </div>

      <div className={styles.sheetList}>
        {submissions.map(s => {
          const col = scoreColor(s.score);
          return (
            <div key={s.id} className={styles.sheetRow}>
              <div className={styles.sheetRowLeft}>
                <div className={styles.sheetName}>{s.studentName}</div>
                <div className={styles.sheetMeta}>
                  {s.status === 'graded' ? 'AI graded' : s.status} · {new Date(s.submittedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              {s.score != null && (
                <div className={styles.score}>
                  <span className={styles.scoreNum} style={{ color: col }}>{s.score}</span>
                  <span className={styles.scoreOf}>/100</span>
                </div>
              )}
              <button className={styles.viewLink} onClick={() => onViewSheet(s)}>
                View
              </button>
            </div>
          );
        })}
        {submissions.length === 0 && <EmptyState icon={SHEET_ICON} text="No submissions yet" />}
      </div>
    </div>
  );
}

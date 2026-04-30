'use client';
import { DeadlineBadge } from '@/app/components/ui/Badge';
import { GhostButton } from '@/app/components/ui/Button';
import { scoreColor } from '@/app/lib/deadlineUtils';
import { exportCSV } from '@/app/lib/exportUtils';
import { SEEDED_SCORES } from '@/app/lib/mockData';
import styles from '@/app/components/dashboard.module.css';

const DL_ICON = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

/** Shows all submitted + graded sheets for a paper. Click "View" opens SheetDetail. */
export default function SheetsList({ paper, subject, onViewSheet }) {
  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Corrected Sheets</h1>
          <p className={styles.pageSubtitle}>{paper.title} · {subject?.name} · {paper.submissions} submissions</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {paper.deadline && <DeadlineBadge deadline={paper.deadline} />}
          <GhostButton onClick={() => exportCSV(paper, subject)} style={{ fontSize: '0.8rem' }}>
            {DL_ICON} Export CSV
          </GhostButton>
        </div>
      </div>

      <div className={styles.sheetList}>
        {Array.from({ length: paper.submissions }, (_, i) => {
          const sc  = SEEDED_SCORES[i % SEEDED_SCORES.length];
          const col = scoreColor(sc);
          return (
            <div key={i} className={styles.sheetRow}>
              <div className={styles.sheetRowLeft}>
                <div className={styles.sheetName}>Student {String(i + 1).padStart(2, '0')}</div>
                <div className={styles.sheetMeta}>Submitted · AI graded</div>
              </div>
              <div className={styles.score}>
                <span className={styles.scoreNum} style={{ color: col }}>{sc}</span>
                <span className={styles.scoreOf}>/100</span>
              </div>
              <button className={styles.viewLink} onClick={() => onViewSheet({ index: i, score: sc })}>
                View
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

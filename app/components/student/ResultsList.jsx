'use client';
import EmptyState from '@/app/components/ui/EmptyState';
import { scoreColor } from '@/app/lib/deadlineUtils';
import styles from '@/app/components/shared/dashboard.module.css';

const CHART_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

export default function ResultsList({ results, onView }) {
  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Results</h1>
          <p className={styles.pageSubtitle}>{results.length} graded submission{results.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className={styles.sheetList}>
        {results.map(r => {
          const col = scoreColor(r.score);
          return (
            <div key={r.id} className={styles.sheetRow} onClick={() => onView(r)}>
              <div className={styles.sheetRowLeft}>
                <div className={styles.sheetName}>{r.paper}</div>
                <div className={styles.sheetMeta}>{r.subject} · {r.date}</div>
              </div>
              <div className={styles.score}>
                <span className={styles.scoreNum} style={{ color: col }}>{r.score}</span>
                <span className={styles.scoreOf}>/100</span>
              </div>
              <button className={styles.viewLink} onClick={e => { e.stopPropagation(); onView(r); }}>View</button>
            </div>
          );
        })}
        {results.length === 0 && <EmptyState icon={CHART_ICON} text="No results yet" />}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { getResults } from '@/app/lib/api';
import EmptyState from '@/app/components/ui/EmptyState';
import { scoreColor } from '@/app/lib/deadlineUtils';
import styles from '@/app/components/shared/dashboard.module.css';

const CHART_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

export default function ResultsList({ onView }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getResults();
        setResults(data.results || []);
      } catch (err) {
        console.error('Failed to load results:', err);
        setError(err.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className={styles.fadeIn} style={{ color: 'rgba(245,245,255,0.3)', padding: 40, textAlign: 'center' }}>Loading results…</div>;
  }

  if (error) {
    return <div className={styles.fadeIn} style={{ color: '#ef4444', padding: 40, textAlign: 'center' }}>Error: {error}</div>;
  }

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

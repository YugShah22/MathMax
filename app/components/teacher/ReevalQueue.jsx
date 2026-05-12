'use client';
import { useState, useEffect } from 'react';
import { getReevaluations, resolveReevaluation } from '@/app/lib/api';
import { Badge }           from '@/app/components/ui/Badge';
import { SmPurpleButton, SmOutlineButton } from '@/app/components/ui/Button';
import EmptyState          from '@/app/components/ui/EmptyState';
import styles              from '@/app/components/shared/dashboard.module.css';

const STATUS_STYLE = {
  pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)',  border: 'rgba(245,158,11,0.25)'  },
  approved: { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)'  },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.09)',   border: 'rgba(239,68,68,0.22)'   },
};

const MSG_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function ReevalQueue() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter]     = useState('all');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getReevaluations();
        setRequests(data.reevaluations || []);
      } catch (err) {
        console.error('Failed to load reevaluations:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleResolve = async (id, status) => {
    try {
      await resolveReevaluation(id, { status, teacherNote: null });
      setRequests(prev => prev.map(r => (r.id || r._id) === id ? { ...r, status } : r));
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pending  = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return <div className={styles.fadeIn} style={{ color: 'rgba(245,245,255,0.3)', padding: 40, textAlign: 'center' }}>Loading requests…</div>;
  }

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Re-evaluation Queue</h1>
          <p className={styles.pageSubtitle}>{pending} pending request{pending !== 1 ? 's' : ''}</p>
        </div>
        <div className={styles.filterRow}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.sheetList}>
        {filtered.map(r => {
          const ss = STATUS_STYLE[r.status];
          return (
            <div key={r.id || r._id} className={styles.reevalRow}>
              <div className={styles.reevalLeft}>
                <div className={styles.reevalHeader}>
                  <span className={styles.sheetName}>{r.student}</span>
                  <span className={styles.codeChip}>{r.question}</span>
                  <Badge label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} {...ss} />
                </div>
                <div className={styles.sheetMeta}>{r.paper} · {r.subject} · {r.date}</div>
                <div className={styles.reevalReason}>"{r.reason}"</div>
              </div>
              {r.status === 'pending' && (
                <div className={styles.reevalActions}>
                  <SmPurpleButton onClick={() => handleResolve(r.id || r._id, 'approved')}>Approve</SmPurpleButton>
                  <SmOutlineButton onClick={() => handleResolve(r.id || r._id, 'rejected')}>Reject</SmOutlineButton>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={MSG_ICON} text={`No ${filter === 'all' ? '' : filter} requests`} />}
      </div>
    </div>
  );
}

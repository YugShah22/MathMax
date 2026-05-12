'use client';
import { useState, useEffect } from 'react';
import { getEnrollments, resolveEnrollment } from '@/app/lib/api';
import { Badge } from '@/app/components/ui/Badge';
import { SmPurpleButton, SmOutlineButton } from '@/app/components/ui/Button';
import EmptyState from '@/app/components/ui/EmptyState';
import styles from '@/app/components/shared/dashboard.module.css';

const STATUS_STYLE = {
  pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)',  border: 'rgba(245,158,11,0.25)' },
  approved: { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)' },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.09)',   border: 'rgba(239,68,68,0.22)' },
};

const USER_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

export default function EnrollmentManager() {
  const [enrollments, setEnrollments] = useState([]);
  const [filter, setFilter]           = useState('pending');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getEnrollments();
        setEnrollments(data.enrollments || []);
      } catch (err) {
        console.error('Failed to load enrollments:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleResolve = async (id, status) => {
    try {
      await resolveEnrollment(id, status);
      setEnrollments(prev => prev.map(e => (e.id || e._id) === id ? { ...e, status } : e));
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const filtered = filter === 'all' ? enrollments : enrollments.filter(e => e.status === filter);
  const pending  = enrollments.filter(e => e.status === 'pending').length;

  if (loading) {
    return <div className={styles.fadeIn} style={{ color: 'rgba(245,245,255,0.3)', padding: 40, textAlign: 'center' }}>Loading requests…</div>;
  }

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Student Requests</h1>
          <p className={styles.pageSubtitle}>{pending} pending request{pending !== 1 ? 's' : ''}</p>
        </div>
        <div className={styles.filterRow}>
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.sheetList}>
        {filtered.map(e => {
          const ss = STATUS_STYLE[e.status];
          return (
            <div key={e.id || e._id} className={styles.reevalRow}>
              <div className={styles.reevalLeft}>
                <div className={styles.reevalHeader}>
                  <span className={styles.sheetName}>{e.studentName}</span>
                  <Badge label={e.status.charAt(0).toUpperCase() + e.status.slice(1)} {...ss} />
                </div>
                <div className={styles.sheetMeta}>
                  {e.studentEmail} · {e.subject}
                  <span style={{ color: e.subjectColor, marginLeft: 6, fontWeight: 600 }}>●</span>
                </div>
              </div>
              {e.status === 'pending' && (
                <div className={styles.reevalActions}>
                  <SmPurpleButton onClick={() => handleResolve(e.id || e._id, 'approved')}>Approve</SmPurpleButton>
                  <SmOutlineButton onClick={() => handleResolve(e.id || e._id, 'rejected')}>Reject</SmOutlineButton>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={USER_ICON} text={`No ${filter === 'all' ? '' : filter} requests`} />}
      </div>
    </div>
  );
}

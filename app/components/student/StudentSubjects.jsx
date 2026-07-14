'use client';
import { useState, useEffect } from 'react';
import { getEnrollments, joinSubject } from '@/app/lib/api';
import EmptyState from '@/app/components/ui/EmptyState';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import styles from '@/app/components/shared/dashboard.module.css';

const STATUS_STYLE = {
  pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)',  border: 'rgba(245,158,11,0.25)' },
  approved: { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)' },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.09)',   border: 'rgba(239,68,68,0.22)' },
};

const BOOK_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const PLUS_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

export default function StudentSubjects({ onGoToPapers }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showJoin, setShowJoin]       = useState(false);
  const [code, setCode]               = useState('');
  const [joining, setJoining]         = useState(false);
  const [message, setMessage]         = useState('');
  const [error, setError]             = useState('');

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

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setError('');
    setMessage('');
    try {
      const data = await joinSubject(code.trim());
      setMessage(data.message || 'Request sent!');
      // Add to list
      if (data.enrollment) {
        setEnrollments(prev => [data.enrollment, ...prev.filter(e => (e.subjectId || e.id) !== data.enrollment.subjectId)]);
      }
      setCode('');
      setTimeout(() => { setShowJoin(false); setMessage(''); }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const approved = enrollments.filter(e => e.status === 'approved');
  const pending  = enrollments.filter(e => e.status === 'pending');
  const rejected = enrollments.filter(e => e.status === 'rejected');

  if (loading) {
    return <div className={styles.fadeIn} style={{ color: 'rgba(245,245,255,0.3)', padding: 40, textAlign: 'center' }}>Loading subjects…</div>;
  }

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Subjects</h1>
          <p className={styles.pageSubtitle}>{approved.length} enrolled · {pending.length} pending</p>
        </div>
        <PrimaryButton onClick={() => setShowJoin(true)}>{PLUS_ICON} Join subject</PrimaryButton>
      </div>

      {/* Join by code form */}
      {showJoin && (
        <div style={{
          background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.2)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 20,
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa', marginBottom: 12 }}>
            Enter the join code shared by your teacher
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className={styles.textInput}
              placeholder="e.g. ALG-7X3K"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              autoFocus
              style={{
                width: 180, letterSpacing: '0.15em', textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono',monospace", fontSize: '1rem', textAlign: 'center',
              }}
            />
            <PrimaryButton onClick={handleJoin} disabled={joining || !code.trim()}>
              {joining ? 'Joining…' : 'Join'}
            </PrimaryButton>
            <GhostButton onClick={() => { setShowJoin(false); setCode(''); setError(''); setMessage(''); }}>Cancel</GhostButton>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>}
          {message && <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: 8 }}>{message}</p>}
        </div>
      )}

      {/* Enrolled subjects */}
      {approved.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(245,245,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Enrolled
          </div>
          <div className={styles.subjectGrid} style={{ marginBottom: 28 }}>
            {approved.map(e => (
              <div
                key={e.id}
                className={styles.subjectCard}
                style={{ cursor: onGoToPapers ? 'pointer' : 'default' }}
                onClick={() => onGoToPapers && onGoToPapers({ subjectId: e.subjectId, name: e.subject, color: e.subjectColor })}
              >
                <div className={styles.subjectAccent} style={{ background: e.subjectColor }} />
                <div className={styles.subjectCardBody}>
                  <div className={styles.subjectInitial} style={{ background: e.subjectColor + '1a', color: e.subjectColor }}>{e.subject[0]}</div>
                  <div className={styles.subjectInfo}>
                    <div className={styles.subjectName}>{e.subject}</div>
                    <div className={styles.subjectMeta}>by {e.teacherName}</div>
                    {onGoToPapers && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(167,139,250,0.5)', marginTop: 3 }}>Click to view papers →</div>
                    )}
                  </div>
                  <Badge label="Enrolled" {...STATUS_STYLE.approved} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(245,245,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Pending approval
          </div>
          <div className={styles.subjectGrid} style={{ marginBottom: 28 }}>
            {pending.map(e => (
              <div key={e.id} className={styles.subjectCard} style={{ cursor: 'default', opacity: 0.7 }}>
                <div className={styles.subjectAccent} style={{ background: e.subjectColor }} />
                <div className={styles.subjectCardBody}>
                  <div className={styles.subjectInitial} style={{ background: e.subjectColor + '1a', color: e.subjectColor }}>{e.subject[0]}</div>
                  <div className={styles.subjectInfo}>
                    <div className={styles.subjectName}>{e.subject}</div>
                    <div className={styles.subjectMeta}>Waiting for {e.teacherName}</div>
                  </div>
                  <Badge label="Pending" {...STATUS_STYLE.pending} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(245,245,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Rejected
          </div>
          <div className={styles.subjectGrid} style={{ marginBottom: 28 }}>
            {rejected.map(e => (
              <div key={e.id} className={styles.subjectCard} style={{ cursor: 'default', opacity: 0.5 }}>
                <div className={styles.subjectAccent} style={{ background: '#ef4444' }} />
                <div className={styles.subjectCardBody}>
                  <div className={styles.subjectInitial} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{e.subject[0]}</div>
                  <div className={styles.subjectInfo}>
                    <div className={styles.subjectName}>{e.subject}</div>
                    <div className={styles.subjectMeta}>{e.teacherName}</div>
                  </div>
                  <Badge label="Rejected" {...STATUS_STYLE.rejected} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {enrollments.length === 0 && !showJoin && (
        <EmptyState icon={BOOK_ICON} text="No subjects yet — join one using your teacher's code" />
      )}
    </div>
  );
}

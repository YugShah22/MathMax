'use client';
import { useState } from 'react';
import { scoreColor } from '@/app/lib/deadlineUtils';
import { Q_BREAKDOWN } from '@/app/lib/mockData';
import { createReevaluation } from '@/app/lib/api';
import { GhostButton, SmPurpleButton, PrimaryButton } from '@/app/components/ui/Button';
import { SubjectBadge } from '@/app/components/ui/Badge';
import styles from '@/app/components/shared/dashboard.module.css';

const SUBJECT_COLORS = { Algebra: '#7c3aed', Calculus: '#0ea5e9', Geometry: '#ec4899' };
const QUESTIONS = ['Simplify the expression', 'Find the roots', 'Prove the identity', 'Evaluate the integral', 'Solve for x', 'Sketch the graph', 'Find the derivative', 'Compute the limit', 'Apply the theorem', 'State and prove'];

export default function ResultDetail({ result, onBack }) {
  const [reevalQ, setReevalQ]       = useState('');
  const [reevalReason, setReevalReason] = useState('');
  const [reevalSent, setReevalSent] = useState(false);
  const [showReeval, setShowReeval] = useState(false);
  const [reevalSubmitting, setReevalSubmitting] = useState(false);
  const [reevalError, setReevalError]           = useState('');

  const color    = result.subjectColor || SUBJECT_COLORS[result.subject] || '#6d28d9';
  const scoreCol = scoreColor(result.score);
  
  const breakdown = result.qBreakdown && result.qBreakdown.length > 0
    ? result.qBreakdown.map(q => [q.got, q.full])
    : Q_BREAKDOWN;

  const total = breakdown.reduce((acc, b) => acc + b[1], 0);

  const submitReeval = async () => {
    if (!reevalQ || !reevalReason.trim()) return;
    setReevalSubmitting(true);
    setReevalError('');
    try {
      await createReevaluation({
        submissionId: result.id,
        question: reevalQ,
        reason: reevalReason.trim(),
      });
      setReevalSent(true);
      setShowReeval(false);
    } catch (err) {
      console.error('Failed to submit re-evaluation request:', err);
      setReevalError(err.message || 'Failed to submit request');
    } finally {
      setReevalSubmitting(false);
    }
  };

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <SubjectBadge name={result.subject} color={color} />
          <h1 className={styles.pageTitle}>{result.paper}</h1>
          <p className={styles.pageSubtitle}>Submitted on {result.date}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: scoreCol, lineHeight: 1 }}>{result.score}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', marginTop: 2 }}>out of {total || 100}</div>
        </div>
      </div>

      {/* AI Feedback */}
      <div className={styles.feedbackBox} style={{ marginBottom: 24 }}>
        <div className={styles.feedbackLabel}>AI Feedback</div>
        <div className={styles.feedbackText}>
          {result.feedback || "Your paper shows a solid understanding of core concepts. Question-wise, Q1–Q3 were excellent. In Q4 and Q7, while the approach was correct, minor computation errors led to partial marks. Focus on step-by-step verification before finalising answers."}
        </div>
      </div>

      {/* Question breakdown */}
      <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>Question breakdown</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {breakdown.map(([got, full], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', color: 'rgba(245,245,255,0.35)', width: 28 }}>Q{i+1}</span>
            <span style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{QUESTIONS[i] || 'Question'}</span>
            <div className={styles.scoreBar}>
              <div className={styles.scoreBarTrack} style={{ width: 80 }}>
                <div className={styles.scoreBarFill} style={{ width: `${(got/full)*100}%`, background: scoreColor((got/full)*100) }}/>
              </div>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8rem', color: scoreColor((got/full)*100), width: 32, textAlign: 'right' }}>{got}/{full}</span>
          </div>
        ))}
      </div>

      {/* Re-evaluation */}
      {reevalSent ? (
        <div className={styles.verifiedTag} style={{ marginBottom: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Re-evaluation request submitted for {reevalQ}.
        </div>
      ) : (
        !showReeval ? (
          <SmPurpleButton onClick={() => setShowReeval(true)}>Request re-evaluation</SmPurpleButton>
        ) : (
          <div className={styles.formCard} style={{ marginBottom: 8 }}>
            <div className={styles.sectionTitle}>Request re-evaluation</div>
            {reevalError && (
              <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 12 }}>
                {reevalError}
              </div>
            )}
            <div className={styles.formSection}>
              <label className={styles.formLabel}>Question</label>
              <select className={styles.selectInput} value={reevalQ} onChange={e => setReevalQ(e.target.value)} style={{ width: '100%' }}>
                <option value="">Select a question</option>
                {breakdown.map((_, i) => <option key={i} value={`Q${i+1}`}>Q{i+1}</option>)}
              </select>
            </div>
            <div className={styles.formSection}>
              <label className={styles.formLabel}>Reason</label>
              <textarea className={styles.textInput} rows={3} placeholder="Explain why you believe marks were incorrectly assigned..."
                value={reevalReason} onChange={e => setReevalReason(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div className={styles.formActions}>
              <GhostButton onClick={() => { setShowReeval(false); setReevalError(''); }}>Cancel</GhostButton>
              <PrimaryButton disabled={!reevalQ || !reevalReason.trim() || reevalSubmitting} onClick={submitReeval}>
                {reevalSubmitting ? 'Submitting…' : 'Submit request'}
              </PrimaryButton>
            </div>
          </div>
        )
      )}
      <div style={{ marginTop: 16 }}>
        <GhostButton onClick={onBack}>Back to results</GhostButton>
      </div>
    </div>
  );
}

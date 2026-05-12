'use client';
import { useState } from 'react';
import FileDropZone from '@/app/components/ui/FileDropZone';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import { formatDeadline } from '@/app/lib/deadlineUtils';
import styles from '@/app/components/shared/dashboard.module.css';

const CLOCK_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/**
 * Direct upload form — no QP code verification needed.
 * The paper is already known from the deadline click on the home screen.
 *
 * Props:
 *   paper: { paper, subject, code, deadline }
 *   onCancel(): void
 */
export default function DirectUploadForm({ paper, onCancel }) {
  const [file, setFile]     = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className={styles.fadeIn} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 24px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f5f5ff', marginBottom: 6 }}>Submitted for evaluation</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.4)' }}>{paper.paper} · {paper.subject}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', marginTop: 4 }}>{file?.name}</div>
        </div>
        <GhostButton onClick={onCancel}>Back to home</GhostButton>
      </div>
    );
  }

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Upload Answer Sheet</h1>
          <p className={styles.pageSubtitle}>{paper.paper} · {paper.subject}</p>
        </div>
      </div>

      <div className={styles.formCard} style={{ maxWidth: 560 }}>
        {/* Paper info card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(109,40,217,0.07)', border: '1px solid rgba(109,40,217,0.18)',
          marginBottom: 4,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5ff' }}>{paper.paper}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.35)', marginTop: 2 }}>{paper.subject}</div>
          </div>
          {paper.deadline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.73rem', color: 'rgba(245,245,255,0.3)', flexShrink: 0 }}>
              {CLOCK_ICON} {formatDeadline(paper.deadline)}
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.25)', marginBottom: 20 }}>
          Code: <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'rgba(167,139,250,0.6)' }}>{paper.code}</span>
        </div>

        <div className={styles.formSection}>
          <label className={styles.formLabel}>Your answer sheet</label>
          <FileDropZone file={file} onFile={setFile} accept=".pdf,.jpg,.jpeg,.png" />
        </div>

        <div className={styles.formActions}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton disabled={!file} onClick={() => setSubmitted(true)}>
            Submit for evaluation
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

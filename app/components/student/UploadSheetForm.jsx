'use client';
import { useState } from 'react';
import { QP_MAP } from '@/app/lib/mockData';
import { dlStatus } from '@/app/lib/deadlineUtils';
import FileDropZone from '@/app/components/ui/FileDropZone';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import { DeadlineBadge } from '@/app/components/ui/Badge';
import styles from '@/app/components/shared/dashboard.module.css';

export default function UploadSheetForm({ prefilledCode = '', onCancel }) {
  const [code, setCode]       = useState(prefilledCode);
  const [verified, setVerified] = useState(null); // null | paper obj | 'invalid'
  const [file, setFile]       = useState(null);
  const [error, setError]     = useState('');

  const verify = () => {
    const match = QP_MAP[code.trim().toUpperCase()];
    if (!match) { setVerified('invalid'); setError('Invalid QP code. Please check and try again.'); return; }
    const ds = dlStatus(match.deadline);
    if (ds?.closed) { setVerified('invalid'); setError(`Submission closed for "${match.paper}".`); return; }
    setVerified(match); setError('');
  };

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Submit Answer Sheet</h1>
          <p className={styles.pageSubtitle}>Enter your QP code and upload your sheet</p>
        </div>
      </div>

      <div className={styles.formCard}>
        {/* Code entry */}
        <div className={styles.formSection}>
          <label className={styles.formLabel}>QP code</label>
          <div className={styles.codeRow}>
            <input className={styles.textInput} placeholder="e.g. ALG-MT-01"
              value={code} onChange={e => { setCode(e.target.value); setVerified(null); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && verify()} style={{ flex: 1 }} />
            <PrimaryButton onClick={verify} disabled={!code.trim()}>Verify</PrimaryButton>
          </div>
          {error && <div className={styles.errorMsg}>{error}</div>}
        </div>

        {/* Verified paper info */}
        {verified && verified !== 'invalid' && (
          <div className={styles.verifiedTag}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {verified.paper} — {verified.subject}
            <DeadlineBadge deadline={verified.deadline} />
          </div>
        )}

        {/* Upload zone — only shown after successful verification */}
        {verified && verified !== 'invalid' && (
          <div className={styles.formSection}>
            <label className={styles.formLabel}>Answer sheet</label>
            <FileDropZone file={file} onFile={setFile} />
          </div>
        )}

        <div className={styles.formActions}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton disabled={!file || !verified || verified === 'invalid'}>
            Submit for evaluation
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

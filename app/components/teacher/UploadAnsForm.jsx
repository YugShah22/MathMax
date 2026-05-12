'use client';
import { useState } from 'react';
import { uploadFile } from '@/app/lib/api';
import FileDropZone from '@/app/components/ui/FileDropZone';
import { DeadlineBadge } from '@/app/components/ui/Badge';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/shared/dashboard.module.css';

export default function UploadAnsForm({ paper, subject, onCancel }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      await uploadFile(file, 'solution');
      // TODO: update paper.solutionPath via API when endpoint is available
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={styles.fadeIn}>
        <div className={styles.formCard} style={{ textAlign: 'center', padding: '40px 28px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>✓</div>
          <h2 style={{ color: '#10b981', fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Answer Sheet Uploaded</h2>
          <p style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.4)' }}>{paper.title} · {subject?.name}</p>
          <div style={{ marginTop: 20 }}>
            <GhostButton onClick={onCancel}>← Back to papers</GhostButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Upload Answer Sheet</h1>
          <p className={styles.pageSubtitle}>{paper.title} · {subject?.name}</p>
        </div>
        {paper.deadline && <DeadlineBadge deadline={paper.deadline} />}
      </div>

      <div className={styles.formCard}>
        <div className={styles.formSection}>
          <label className={styles.formLabel}>Answer sheet</label>
          <FileDropZone file={file} onFile={setFile} multiple />
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '8px 0 0' }}>{error}</p>}
        <div className={styles.formActions}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton disabled={!file || loading} onClick={handleSubmit}>
            {loading ? 'Uploading…' : 'Submit for evaluation'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

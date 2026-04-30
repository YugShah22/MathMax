'use client';
import { useState } from 'react';
import FileDropZone from '@/app/components/ui/FileDropZone';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/dashboard.module.css';

export default function UploadQPForm({ subject, onCancel }) {
  const [title, setTitle]       = useState('');
  const [deadline, setDeadline] = useState('');
  const [qpFile, setQpFile]     = useState(null);
  const [solFile, setSolFile]   = useState(null);

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Upload Question Paper</h1>
          <p className={styles.pageSubtitle}>{subject?.name}</p>
        </div>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formSection}>
          <label className={styles.formLabel}>Title</label>
          <input className={styles.textInput} placeholder="e.g. Midterm Exam"
            value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div className={styles.formSection}>
          <label className={styles.formLabel}>Submission deadline</label>
          <input className={`${styles.textInput} ${styles.dateInput}`} type="datetime-local"
            value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: '100%' }} />
          {deadline && <p style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.3)', marginTop: 4 }}>Students cannot submit after this time.</p>}
        </div>

        <div className={styles.formSection}>
          <label className={styles.formLabel}>Question paper</label>
          <FileDropZone file={qpFile} onFile={setQpFile} />
        </div>

        <div className={styles.formSection}>
          <label className={styles.formLabel}>
            Solution / Answer key
            <span className={styles.optTag}>Optional</span>
          </label>
          <FileDropZone file={solFile} onFile={setSolFile} />
        </div>

        <div className={styles.codeInfoBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <div className={styles.codeInfoLabel}>QP Code</div>
            <div className={styles.codeInfoValue}>Generated after upload</div>
            <div className={styles.codeInfoHint}>Share this code with students to allow submissions.</div>
          </div>
        </div>

        <div className={styles.formActions}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton disabled={!qpFile || !title.trim()}>Upload &amp; generate code</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

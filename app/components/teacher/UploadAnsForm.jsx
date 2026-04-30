'use client';
import { useState } from 'react';
import FileDropZone from '@/app/components/ui/FileDropZone';
import { DeadlineBadge } from '@/app/components/ui/Badge';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/dashboard.module.css';

export default function UploadAnsForm({ paper, subject, onCancel }) {
  const [file, setFile] = useState(null);

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
        <div className={styles.formActions}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton disabled={!file}>Submit for evaluation</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

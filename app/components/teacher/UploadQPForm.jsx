'use client';
import { useState } from 'react';
import { uploadFile, createPaper } from '@/app/lib/api';
import FileDropZone from '@/app/components/ui/FileDropZone';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/shared/dashboard.module.css';

export default function UploadQPForm({ subject, onCancel, onCreated }) {
  const [title, setTitle]       = useState('');
  const [deadline, setDeadline] = useState('');
  const [qpFile, setQpFile]     = useState(null);
  const [solFile, setSolFile]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null); // { code } after success

  const handleSubmit = async () => {
    if (!title.trim() || !qpFile) return;
    setLoading(true);
    setError('');
    try {
      // 1. Upload QP file
      const qpUpload = await uploadFile(qpFile, 'qp');

      // 2. Upload solution file (optional)
      let solPath = null;
      if (solFile) {
        const solUpload = await uploadFile(solFile, 'solution');
        solPath = solUpload.filePath;
      }

      // 3. Create paper in DB (backend auto-generates code)
      const data = await createPaper({
        subjectId: subject.id || subject._id,
        title: title.trim(),
        deadline: deadline || null,
      });

      const paper = { ...data.paper, id: data.paper._id || data.paper.id };
      setResult(paper);

      // Notify parent
      if (onCreated) onCreated(paper);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──
  if (result) {
    return (
      <div className={styles.fadeIn}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Paper Created!</h1>
            <p className={styles.pageSubtitle}>{subject?.name}</p>
          </div>
        </div>

        <div className={styles.formCard} style={{ textAlign: 'center', padding: '36px 28px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(245,245,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            QP Code
          </div>
          <div style={{
            fontSize: '2.2rem', fontWeight: 900, letterSpacing: '0.15em',
            fontFamily: "'JetBrains Mono',monospace", color: '#67e8f9',
            background: 'rgba(103,232,249,0.06)', border: '1px solid rgba(103,232,249,0.2)',
            borderRadius: 12, padding: '18px 28px', display: 'inline-block',
            cursor: 'pointer', userSelect: 'all',
          }}
            onClick={() => { navigator.clipboard.writeText(result.code); }}
            title="Click to copy"
          >
            {result.code}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(245,245,255,0.35)', marginTop: 14 }}>
            Share this code with students. Click to copy.
          </p>
          {result.deadline && (
            <p style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.25)', marginTop: 6 }}>
              Deadline: {new Date(result.deadline).toLocaleString('en-IN')}
            </p>
          )}
          <div style={{ marginTop: 24 }}>
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

        {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '8px 0 0' }}>{error}</p>}

        <div className={styles.formActions}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton disabled={!qpFile || !title.trim() || loading} onClick={handleSubmit}>
            {loading ? 'Uploading…' : 'Upload & generate code'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

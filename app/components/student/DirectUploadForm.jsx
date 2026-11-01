'use client';
import { useState } from 'react';
import FileDropZone from '@/app/components/ui/FileDropZone';
import { PrimaryButton, GhostButton, SmOutlineButton } from '@/app/components/ui/Button';
import { formatDeadline } from '@/app/lib/deadlineUtils';
import {
  uploadFile,
  createSubmission,
  uploadAnswerSheet,
  getDocumentPages,
  retryDocumentProcessing,
  getDocumentPageFileUrl,
} from '@/app/lib/api';
import styles from '@/app/components/shared/dashboard.module.css';

const CLOCK_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/**
 * Direct upload form — student uploads their answer sheet for a paper / examination.
 * Supports PDF and image formats with multi-page extraction and processing status tracking.
 * Props:
 *   paper: { id, title, subject, subjectColor, code, deadline }
 *   onCancel(): void
 */
export default function DirectUploadForm({ paper, onCancel }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [docInfo, setDocInfo] = useState(null);
  const [pages, setPages] = useState([]);
  const [retrying, setRetrying] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      // 1. First attempt Phase 3 FastAPI ingestion if available
      try {
        const doc = await uploadAnswerSheet(paper.id, file);
        setDocInfo(doc);

        // Fetch extracted pages
        try {
          const pagesRes = await getDocumentPages(doc.id);
          setPages(pagesRes.items || []);
        } catch {
          setPages([]);
        }

        setSubmitted(true);
        setLoading(false);
        return;
      } catch (fastApiErr) {
        // If not a Phase 3 examination (e.g. 404 Examination not found), fallback to legacy submission
        if (fastApiErr.message?.includes('Examination not found') || fastApiErr.message?.includes('404')) {
          const { filePath } = await uploadFile(file, 'answer');
          await createSubmission({ paperId: paper.id, filePath });
          setSubmitted(true);
          setLoading(false);
          return;
        }
        // Genuine validation or ingestion error
        throw fastApiErr;
      }
    } catch (err) {
      console.error('Submission failed:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!docInfo?.id) return;
    setRetrying(true);
    try {
      const updated = await retryDocumentProcessing(docInfo.id);
      setDocInfo(updated);
      const pagesRes = await getDocumentPages(updated.id);
      setPages(pagesRes.items || []);
    } catch (err) {
      setError(err.message || 'Retry failed.');
    } finally {
      setRetrying(false);
    }
  };

  if (submitted) {
    const isSuccess = docInfo ? docInfo.status === 'processed' || docInfo.status === 'processing' : true;
    return (
      <div className={styles.fadeIn} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 24px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: isSuccess ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSuccess ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5f5ff', marginBottom: 6 }}>
            {docInfo ? (isSuccess ? 'Answer Sheet Ingested Successfully' : 'Ingestion Requires Attention') : 'Submitted for evaluation'}
          </div>
          <div style={{ fontSize: '0.84rem', color: 'rgba(245,245,255,0.5)' }}>{paper.title} · {paper.subject}</div>
          <div style={{ fontSize: '0.80rem', color: 'rgba(245,245,255,0.4)', marginTop: 4 }}>
            File: <strong>{docInfo?.original_filename || file?.name}</strong>
            {docInfo?.page_count ? ` · ${docInfo.page_count} page${docInfo.page_count > 1 ? 's' : ''} extracted` : ''}
          </div>
        </div>

        {/* Status card if FastAPI Document */}
        {docInfo && (
          <div style={{
            width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.4)' }}>Document Status</span>
              <span style={{
                padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                textTransform: 'uppercase',
                background: docInfo.status === 'processed' ? 'rgba(52,211,153,0.15)' : docInfo.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.15)',
                color: docInfo.status === 'processed' ? '#34d399' : docInfo.status === 'failed' ? '#f87171' : '#38bdf8',
                border: `1px solid ${docInfo.status === 'processed' ? 'rgba(52,211,153,0.3)' : docInfo.status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.3)'}`,
              }}>
                {docInfo.status}
              </span>
            </div>

            {docInfo.status === 'failed' && (
              <div style={{ fontSize: '0.78rem', color: '#f87171' }}>
                Error: {docInfo.processing_error || 'An error occurred during page processing.'}
                <div style={{ marginTop: 8 }}>
                  <SmOutlineButton onClick={handleRetry} disabled={retrying}>
                    {retrying ? 'Retrying…' : 'Retry Processing'}
                  </SmOutlineButton>
                </div>
              </div>
            )}

            {pages.length > 0 && (
              <div>
                <div style={{ fontSize: '0.76rem', color: 'rgba(245,245,255,0.45)', marginBottom: 8 }}>
                  Extracted Pages ({pages.length})
                </div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                  {pages.map(p => (
                    <div
                      key={p.id}
                      style={{
                        flexShrink: 0, width: 84, height: 110,
                        background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', position: 'relative',
                      }}
                    >
                      <img
                        src={getDocumentPageFileUrl(docInfo.id, p.id)}
                        alt={`Page ${p.page_number}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <span style={{
                        position: 'absolute', bottom: 3, right: 3,
                        background: 'rgba(0,0,0,0.7)', color: '#e2e8f0',
                        fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4,
                      }}>
                        P{p.page_number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.35)', textAlign: 'center' }}>
          Your answer sheet is securely stored and ready for step-wise evaluation.
        </div>

        <GhostButton onClick={onCancel}>Back to Papers</GhostButton>
      </div>
    );
  }

  const color = paper.subjectColor || '#7c3aed';

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Upload Answer Sheet</h1>
          <p className={styles.pageSubtitle}>{paper.title} · {paper.subject}</p>
        </div>
      </div>

      <div className={styles.formCard} style={{ maxWidth: 560 }}>
        {/* Paper info card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', borderRadius: 10,
          background: `${color}12`, border: `1px solid ${color}30`,
          marginBottom: 4,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `${color}20`, border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5ff' }}>{paper.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.35)', marginTop: 2 }}>{paper.subject}</div>
          </div>
          {paper.deadline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.73rem', color: 'rgba(245,245,255,0.3)', flexShrink: 0 }}>
              {CLOCK_ICON} {formatDeadline(paper.deadline)}
            </div>
          )}
        </div>

        {paper.code && (
          <div style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.25)', marginBottom: 20 }}>
            Code: <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'rgba(167,139,250,0.6)' }}>{paper.code}</span>
          </div>
        )}

        <div className={styles.formSection}>
          <label className={styles.formLabel}>Your answer sheet (PDF, PNG, JPG)</label>
          <p style={{ margin: '0 0 8px', fontSize: '0.76rem', color: 'rgba(245,245,255,0.4)' }}>
            Upload up to 50 pages. Each page will be verified and prepared for mathematical evaluation.
          </p>
          <FileDropZone file={file} onFile={setFile} accept=".pdf,.jpg,.jpeg,.png" />
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 8, marginBottom: 0 }}>{error}</p>
        )}

        <div className={styles.formActions}>
          <GhostButton onClick={onCancel} disabled={loading}>Cancel</GhostButton>
          <PrimaryButton disabled={!file || loading} onClick={handleSubmit}>
            {loading ? 'Uploading & Extracting Pages…' : 'Submit for evaluation'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

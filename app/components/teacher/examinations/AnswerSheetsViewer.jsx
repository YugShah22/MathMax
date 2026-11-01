'use client';
import { useState, useEffect } from 'react';
import {
  getExaminationAnswerSheets,
  getDocumentPages,
  retryDocumentProcessing,
  deleteDocument,
  uploadAnswerSheet,
  getDocumentPageFileUrl,
  getDocumentFileUrl,
} from '@/app/lib/api';
import { PrimaryButton, SmOutlineButton, GhostButton } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import EmptyState from '@/app/components/ui/EmptyState';
import FileDropZone from '@/app/components/ui/FileDropZone';

const STATUS_CONFIG = {
  processed:  { label: 'Processed',  color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
  processing: { label: 'Processing', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.25)' },
  validating: { label: 'Validating', color: '#fbbf24', bg: 'rgba(251,191,24,0.1)', border: 'rgba(251,191,24,0.25)' },
  uploaded:   { label: 'Uploaded',   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  failed:     { label: 'Failed',     color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AnswerSheetsViewer({ exam, onBack, showToast }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docPages, setDocPages] = useState({});
  const [loadingPages, setLoadingPages] = useState({});
  const [previewPage, setPreviewPage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState(null);
  const [uploadStudentId, setUploadStudentId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await getExaminationAnswerSheets(exam.id);
      setDocuments(res.items || []);
    } catch (err) {
      console.error('Failed to load answer sheets:', err);
      showToast?.(err.message || 'Failed to load answer sheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (exam?.id) loadDocuments();
  }, [exam?.id]);

  const toggleViewPages = async (doc) => {
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(null);
      return;
    }
    setSelectedDoc(doc);

    if (!docPages[doc.id]) {
      setLoadingPages(prev => ({ ...prev, [doc.id]: true }));
      try {
        const res = await getDocumentPages(doc.id);
        setDocPages(prev => ({ ...prev, [doc.id]: res.items || [] }));
      } catch (err) {
        showToast?.('Failed to load pages for document');
      } finally {
        setLoadingPages(prev => ({ ...prev, [doc.id]: false }));
      }
    }
  };

  const handleRetry = async (docId) => {
    try {
      await retryDocumentProcessing(docId);
      showToast?.('Processing retry started');
      loadDocuments();
    } catch (err) {
      showToast?.(err.message || 'Retry failed');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this answer sheet and its extracted pages?')) return;
    try {
      await deleteDocument(docId);
      showToast?.('Answer sheet deleted');
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      loadDocuments();
    } catch (err) {
      showToast?.(err.message || 'Delete failed');
    }
  };

  const handleTeacherUpload = async (e) => {
    e.preventDefault();
    if (!uploadFileObj) return;
    setUploading(true);
    setUploadError('');

    try {
      await uploadAnswerSheet(exam.id, uploadFileObj, {
        studentId: uploadStudentId.trim() || undefined,
      });
      showToast?.('Answer sheet uploaded and extracted');
      setShowUploadModal(false);
      setUploadFileObj(null);
      setUploadStudentId('');
      loadDocuments();
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const counts = {
    total: documents.length,
    processed: documents.filter(d => d.status === 'processed').length,
    processing: documents.filter(d => d.status === 'processing' || d.status === 'validating').length,
    failed: documents.filter(d => d.status === 'failed').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SmOutlineButton onClick={onBack}>
              ← Back to Exams
            </SmOutlineButton>
            <span style={{ fontSize: '0.78rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 8px', borderRadius: 999 }}>
              {exam.subject}
            </span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '8px 0 2px', color: '#f8fafc' }}>
            {exam.title} — Student Submissions
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(245,245,255,0.45)' }}>
            Document ingestion, page extraction, and status tracking for student answer sheets
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <PrimaryButton onClick={() => setShowUploadModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Answer Sheet
          </PrimaryButton>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.4)' }}>Total Uploads</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>{counts.total}</div>
        </div>
        <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Processed & Ready</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399', marginTop: 4 }}>{counts.processed}</div>
        </div>
        <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>In Processing</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>{counts.processing}</div>
        </div>
        <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Failed Ingestion</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f87171', marginTop: 4 }}>{counts.failed}</div>
        </div>
      </div>

      {/* ── Documents Table / Cards ── */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(245,245,255,0.3)', fontSize: '0.9rem' }}>
          Loading student answer sheets…
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
          text="No answer sheets submitted yet for this examination. Students can upload their papers or you can upload on their behalf."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {documents.map(doc => {
            const sc = STATUS_CONFIG[doc.status] || STATUS_CONFIG.uploaded;
            const isSelected = selectedDoc?.id === doc.id;
            const pages = docPages[doc.id] || [];

            return (
              <div
                key={doc.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc' }}>
                        {doc.original_filename}
                      </span>
                      <Badge label={sc.label} color={sc.color} bg={sc.bg} border={sc.border} />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'rgba(245,245,255,0.4)', marginTop: 4, display: 'flex', gap: 12 }}>
                      <span>Size: <strong>{formatBytes(doc.file_size)}</strong></span>
                      <span>Pages: <strong>{doc.page_count}</strong></span>
                      {doc.student_id && <span>Student ID: <code style={{ color: '#a78bfa' }}>{doc.student_id.slice(-6)}</code></span>}
                      <span>Uploaded: {new Date(doc.uploaded_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <SmOutlineButton onClick={() => toggleViewPages(doc)}>
                      {isSelected ? 'Hide Pages' : `View Pages (${doc.page_count})`}
                    </SmOutlineButton>

                    <a
                      href={getDocumentFileUrl(doc.id)}
                      download={doc.original_filename}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <SmOutlineButton>Download</SmOutlineButton>
                    </a>

                    {doc.status === 'failed' && (
                      <SmOutlineButton onClick={() => handleRetry(doc.id)} style={{ color: '#f87171' }}>
                        Retry
                      </SmOutlineButton>
                    )}

                    <SmOutlineButton onClick={() => handleDelete(doc.id)} style={{ color: '#ef4444' }}>
                      Delete
                    </SmOutlineButton>
                  </div>
                </div>

                {/* Error Banner */}
                {doc.processing_error && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                    fontSize: '0.78rem', color: '#fca5a5',
                  }}>
                    Processing Error: {doc.processing_error}
                  </div>
                )}

                {/* Extracted Pages Gallery */}
                {isSelected && (
                  <div style={{
                    marginTop: 8, paddingTop: 14,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {loadingPages[doc.id] ? (
                      <div style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.3)', padding: 12 }}>
                        Loading extracted pages…
                      </div>
                    ) : pages.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.3)', padding: 12 }}>
                        No pages extracted yet for this document.
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.45)', marginBottom: 10 }}>
                          Extracted Pages ({pages.length}) — Click thumbnail to inspect full resolution
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {pages.map(page => (
                            <div
                              key={page.id}
                              onClick={() => setPreviewPage(page)}
                              style={{
                                cursor: 'pointer',
                                width: 110, height: 145,
                                background: '#0b1120',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 8, overflow: 'hidden',
                                position: 'relative', display: 'flex', flexDirection: 'column',
                                transition: 'transform 0.15s, border-color 0.15s',
                              }}
                            >
                              <img
                                src={getDocumentPageFileUrl(doc.id, page.id)}
                                alt={`Page ${page.page_number}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div style={{
                                position: 'absolute', bottom: 4, left: 4, right: 4,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'rgba(0,0,0,0.75)', padding: '2px 6px', borderRadius: 4,
                                fontSize: '0.68rem', color: '#e2e8f0',
                              }}>
                                <span>P{page.page_number}</span>
                                <span>{page.original_width}×{page.original_height}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Page Preview Modal ── */}
      {previewPage && selectedDoc && (
        <div
          onClick={() => setPreviewPage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '90vh', maxWidth: '90vw',
              background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div>
                <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>
                  Page {previewPage.page_number}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.4)', marginLeft: 10 }}>
                  {previewPage.original_width} × {previewPage.original_height} px · {previewPage.image_format}
                </span>
              </div>
              <GhostButton onClick={() => setPreviewPage(null)}>Close</GhostButton>
            </div>
            <div style={{ overflow: 'auto', padding: 16, display: 'flex', justifyContent: 'center' }}>
              <img
                src={getDocumentPageFileUrl(selectedDoc.id, previewPage.id)}
                alt={`Page ${previewPage.page_number}`}
                style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 4 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Teacher Upload Answer Sheet Modal ── */}
      {showUploadModal && (
        <div
          onClick={() => setShowUploadModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Upload Student Answer Sheet
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(245,245,255,0.45)' }}>
              Upload a student's handwritten answer sheet (PDF, PNG, JPG). Pages will be automatically extracted.
            </p>

            <form onSubmit={handleTeacherUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(245,245,255,0.6)', marginBottom: 6 }}>
                  Student ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 660f1b2c4d..."
                  value={uploadStudentId}
                  onChange={(e) => setUploadStudentId(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8, color: '#f8fafc', fontSize: '0.85rem', outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(245,245,255,0.6)', marginBottom: 6 }}>
                  Answer Sheet File
                </label>
                <FileDropZone file={uploadFileObj} onFile={setUploadFileObj} accept=".pdf,.png,.jpg,.jpeg" />
              </div>

              {uploadError && (
                <div style={{ fontSize: '0.78rem', color: '#f87171' }}>{uploadError}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <GhostButton onClick={() => setShowUploadModal(false)} disabled={uploading}>Cancel</GhostButton>
                <PrimaryButton disabled={!uploadFileObj || uploading} onClick={handleTeacherUpload}>
                  {uploading ? 'Ingesting…' : 'Upload & Extract'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


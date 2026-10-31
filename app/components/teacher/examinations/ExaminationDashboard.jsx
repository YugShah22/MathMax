'use client';
import { useState, useEffect } from 'react';
import StatCard from '@/app/components/ui/StatCard';
import EmptyState from '@/app/components/ui/EmptyState';
import { PrimaryButton, SmOutlineButton, SmPurpleButton } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import {
  getExaminationStats,
  getExaminations,
  duplicateExamination,
  archiveExamination,
  deleteExamination,
} from '@/app/lib/api';

const STATUS_BADGES = {
  draft:     { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', label: 'Draft' },
  ready:     { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.25)', label: 'Ready' },
  published: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', label: 'Published' },
  archived:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', label: 'Archived' },
};

export default function ExaminationDashboard({
  onCreateExam,
  onEditExam,
  onManageQuestions,
  onPreviewExam,
  showToast,
}) {
  const [stats, setStats] = useState({ total: 0, draft: 0, published: 0, archived: 0 });
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, eData] = await Promise.all([
        getExaminationStats().catch(() => ({ total: 0, draft: 0, published: 0, archived: 0 })),
        getExaminations({ status: statusFilter || undefined, search: search || undefined, page, pageSize: 9 })
          .catch(() => ({ examinations: [], total: 0, pages: 1 })),
      ]);
      setStats(sData);
      setExams(eData.examinations || []);
      setTotalCount(eData.total || 0);
      setTotalPages(eData.pages || 1);
    } catch (err) {
      console.error('Failed to load examinations:', err);
      showToast?.(err.message || 'Error loading examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleDuplicate = async (exam) => {
    try {
      const dup = await duplicateExamination(exam.id);
      showToast?.(`Duplicated as "${dup.title}"`);
      loadData();
    } catch (err) {
      showToast?.(err.message || 'Duplicate failed');
    }
  };

  const handleArchive = async (exam) => {
    if (!window.confirm(`Archive examination "${exam.title}"?`)) return;
    try {
      await archiveExamination(exam.id);
      showToast?.('Examination archived');
      loadData();
    } catch (err) {
      showToast?.(err.message || 'Archive failed');
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Permanently delete examination "${exam.title}"? This cannot be undone.`)) return;
    try {
      await deleteExamination(exam.id);
      showToast?.('Examination deleted');
      loadData();
    } catch (err) {
      showToast?.(err.message || 'Delete failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            Examinations & Rubrics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'rgba(245,245,255,0.45)' }}>
            Manage examinations, question schemes, answer keys, and step-wise grading rubrics
          </p>
        </div>
        <PrimaryButton onClick={onCreateExam}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Examination
        </PrimaryButton>
      </div>

      {/* ── Stats Overview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <StatCard label="Total Exams" value={stats.total} unit="" color="#c084fc" />
        <StatCard label="Drafts" value={stats.draft} unit="" color="#fbbf24" />
        <StatCard label="Published" value={stats.published} unit="" color="#34d399" />
        <StatCard label="Archived" value={stats.archived} unit="" color="#94a3b8" />
      </div>

      {/* ── Search & Filter Controls ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, padding: '14px 18px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: '1 1 280px', maxWidth: 420 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Search by title or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 34px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: '#f8fafc', fontSize: '0.85rem', outline: 'none',
              }}
            />
            <svg style={{ position: 'absolute', left: 10, top: 10, color: 'rgba(245,245,255,0.3)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <SmOutlineButton onClick={handleSearchSubmit}>Search</SmOutlineButton>
        </form>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { key: '', label: 'All' },
            { key: 'draft', label: 'Draft' },
            { key: 'published', label: 'Published' },
            { key: 'archived', label: 'Archived' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              style={{
                padding: '6px 12px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
                border: statusFilter === tab.key ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.08)',
                background: statusFilter === tab.key ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: statusFilter === tab.key ? '#e2e8f0' : 'rgba(245,245,255,0.45)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Examination Cards Grid ── */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(245,245,255,0.3)', fontSize: '0.9rem' }}>
          Loading examinations…
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
          text="No examinations found. Create your first exam to configure questions and rubrics."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {exams.map(exam => {
            const sb = STATUS_BADGES[exam.status] || STATUS_BADGES.draft;
            return (
              <div
                key={exam.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '20px',
                  display: 'flex', flexDirection: 'column', gap: 14,
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                {/* Header with subject & status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                      fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa',
                      background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
                      marginBottom: 6,
                    }}>
                      {exam.subject}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.3 }}>
                      {exam.title}
                    </h3>
                  </div>
                  <Badge label={sb.label} color={sb.color} bg={sb.bg} border={sb.border} />
                </div>

                {/* Details */}
                <p style={{
                  margin: 0, fontSize: '0.82rem', color: 'rgba(245,245,255,0.4)',
                  lineHeight: 1.4, minHeight: 34,
                }}>
                  {exam.description || 'No description provided.'}
                </p>

                <div style={{
                  display: 'flex', gap: 16, fontSize: '0.76rem', color: 'rgba(245,245,255,0.5)',
                  padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div><strong style={{ color: '#e2e8f0' }}>{exam.total_marks}</strong> Marks</div>
                  <div><strong style={{ color: '#e2e8f0' }}>{exam.duration_minutes}</strong> Mins</div>
                  <div>Type: <strong style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>{exam.examination_type?.replace('_', ' ')}</strong></div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  <SmPurpleButton onClick={() => onManageQuestions(exam)}>
                    Questions & Rubrics
                  </SmPurpleButton>
                  <SmOutlineButton onClick={() => onPreviewExam(exam)}>
                    Preview
                  </SmOutlineButton>
                  <SmOutlineButton onClick={() => onEditExam(exam)}>
                    Edit
                  </SmOutlineButton>
                  <SmOutlineButton onClick={() => handleDuplicate(exam)} title="Duplicate">
                    Copy
                  </SmOutlineButton>
                  {exam.status !== 'archived' && (
                    <SmOutlineButton onClick={() => handleArchive(exam)} style={{ color: '#94a3b8' }}>
                      Archive
                    </SmOutlineButton>
                  )}
                  {exam.status !== 'published' && (
                    <SmOutlineButton onClick={() => handleDelete(exam)} style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}>
                      Delete
                    </SmOutlineButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <SmOutlineButton disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Previous
          </SmOutlineButton>
          <span style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.45)' }}>
            Page {page} of {totalPages} ({totalCount} total)
          </span>
          <SmOutlineButton disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            Next
          </SmOutlineButton>
        </div>
      )}
    </div>
  );
}


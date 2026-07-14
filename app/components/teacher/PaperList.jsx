'use client';
import { useState } from 'react';
import EmptyState from '@/app/components/ui/EmptyState';
import { DeadlineBadge } from '@/app/components/ui/Badge';
import { PrimaryButton, GhostButton, SmOutlineButton, SmPurpleButton } from '@/app/components/ui/Button';
import { dlStatus, formatDeadline } from '@/app/lib/deadlineUtils';
import { updatePaper, deletePaper } from '@/app/lib/api';
import styles from '@/app/components/shared/dashboard.module.css';

const PAPER_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const CLOCK_ICON = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const COPY_ICON  = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const EDIT_ICON  = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TRASH_ICON = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;

/* ── toLocalISOString — produce "YYYY-MM-DDTHH:mm" for datetime-local input ── */
function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── Edit Paper Modal ─────────────────────────────────────────── */
function EditPaperModal({ paper, subjectColor, onSave, onClose }) {
  const [title,    setTitle]    = useState(paper.title);
  const [deadline, setDeadline] = useState(toDatetimeLocal(paper.deadline));
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const save = async () => {
    if (!title.trim()) { setError('Title cannot be empty'); return; }
    setSaving(true); setError('');
    try {
      const data = await updatePaper(paper.id || paper._id, {
        title: title.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      onSave(data.paper);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#161622', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '28px 28px', width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f5f5ff', marginBottom: 22 }}>Edit Paper</div>

        {/* Code chip (read-only) */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(245,245,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
            Paper Code (auto-generated)
          </label>
          <span style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: '0.85rem',
            color: (subjectColor || '#a78bfa'),
            background: (subjectColor || '#7c3aed') + '18',
            border: `1px solid ${(subjectColor || '#7c3aed')}30`,
            padding: '4px 10px', borderRadius: 6, display: 'inline-block',
          }}>{paper.code}</span>
        </div>

        {/* Title */}
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(245,245,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
          Title
        </label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 12px', color: '#f5f5ff',
            fontSize: '0.9rem', outline: 'none', marginBottom: 20, fontFamily: 'inherit',
          }}
        />

        {/* Deadline */}
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(245,245,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
          Deadline
        </label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 12px', color: '#f5f5ff',
            fontSize: '0.9rem', outline: 'none', marginBottom: 8, fontFamily: 'inherit',
            colorScheme: 'dark',
          }}
        />
        <div style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.25)', marginBottom: 24 }}>
          Leave blank to remove the deadline
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <GhostButton onClick={onClose} disabled={saving}>Cancel</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function PaperList({ papers, setPapers, subject, onUploadQP, onSheets, onAnalytics, onUploadAns, onCopyCode }) {
  const [editPaper, setEditPaper] = useState(null);

  const handleEditSave = (updated) => {
    setPapers(prev => prev.map(p =>
      String(p.id || p._id) === String(updated.id)
        ? { ...p, title: updated.title, deadline: updated.deadline }
        : p
    ));
    setEditPaper(null);
  };

  const handleDelete = async (e, paperId) => {
    e.stopPropagation();
    if (!confirm('Delete this paper and all its submissions? This cannot be undone.')) return;
    try {
      await deletePaper(paperId);
      setPapers(prev => prev.filter(p => String(p.id || p._id) !== String(paperId)));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={styles.fadeIn}>
      {editPaper && (
        <EditPaperModal
          paper={editPaper}
          subjectColor={subject.color}
          onSave={handleEditSave}
          onClose={() => setEditPaper(null)}
        />
      )}

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.subjectBadge} style={{ background: subject.color + '1a', color: subject.color, borderColor: subject.color + '44' }}>{subject.name}</div>
          <h1 className={styles.pageTitle}>Question Papers</h1>
          <p className={styles.pageSubtitle}>{papers.length} paper{papers.length !== 1 ? 's' : ''}</p>
        </div>
        <PrimaryButton onClick={onUploadQP}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload paper
        </PrimaryButton>
      </div>

      <div className={styles.paperList}>
        {papers.map(p => {
          const ds = dlStatus(p.deadline);
          return (
            <div key={p.id} className={`${styles.paperRow} ${ds?.closed ? styles.paperRowClosed : ''}`}>
              <div className={styles.paperRowLeft}>
                <div className={styles.paperDot} style={{ background: subject.color }} />
                <div style={{ flex: 1 }}>
                  <div className={styles.paperTitle}>{p.title}</div>
                  <div className={styles.paperMeta}>{p.date} · {p.submissions} submission{p.submissions !== 1 ? 's' : ''}</div>
                  <div className={styles.paperCode}>
                    Code: <span className={styles.codeChip}>{p.code}</span>
                    <button className={styles.copyBtn} onClick={() => onCopyCode(p.code)} title="Copy">{COPY_ICON}</button>
                  </div>
                  {p.deadline && (
                    <div className={styles.paperDeadline}>
                      {CLOCK_ICON}
                      {formatDeadline(p.deadline)}
                      <DeadlineBadge deadline={p.deadline} />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.paperRowActions}>
                <SmOutlineButton onClick={() => onAnalytics(p)}>Analytics</SmOutlineButton>
                <SmOutlineButton onClick={() => onSheets(p)}>Sheets</SmOutlineButton>
                {!ds?.closed && <SmPurpleButton onClick={() => onUploadAns(p)}>Upload sheet</SmPurpleButton>}

                {/* Edit */}
                <button
                  onClick={e => { e.stopPropagation(); setEditPaper(p); }}
                  title="Edit paper"
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 7, padding: '5px 8px', color: 'rgba(245,245,255,0.4)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(109,40,217,0.15)'; e.currentTarget.style.color = '#a78bfa'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(245,245,255,0.4)'; }}
                >
                  {EDIT_ICON} Edit
                </button>

                {/* Delete */}
                <button
                  onClick={e => handleDelete(e, p.id || p._id)}
                  title="Delete paper"
                  style={{
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 7, padding: '5px 8px', color: 'rgba(239,68,68,0.5)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; }}
                >
                  {TRASH_ICON} Delete
                </button>
              </div>
            </div>
          );
        })}
        {papers.length === 0 && <EmptyState icon={PAPER_ICON} text="No papers uploaded yet" />}
      </div>
    </div>
  );
}

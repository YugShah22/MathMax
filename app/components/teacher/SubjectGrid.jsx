'use client';
import { useState } from 'react';
import { createSubject, deleteSubject, updateSubject } from '@/app/lib/api';
import EmptyState from '@/app/components/ui/EmptyState';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/shared/dashboard.module.css';

const PALETTE = ['#7c3aed','#0ea5e9','#ec4899','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4'];

const GRID_ICON  = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const PLUS_ICON  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TRASH_ICON = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const EDIT_ICON  = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

/* ── Inline edit modal overlay ────────────────────────────────── */
function EditSubjectModal({ subject, onSave, onClose }) {
  const [name,  setName]  = useState(subject.name);
  const [color, setColor] = useState(subject.color);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Name cannot be empty'); return; }
    setSaving(true); setError('');
    try {
      const data = await updateSubject(subject.id || subject._id, { name: name.trim(), color });
      onSave(data.subject);
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
          borderRadius: 16, padding: '28px 28px', width: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f5f5ff', marginBottom: 22 }}>Edit Subject</div>

        {/* Name */}
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(245,245,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
          Name
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 12px', color: '#f5f5ff',
            fontSize: '0.9rem', outline: 'none', marginBottom: 20,
            fontFamily: 'inherit',
          }}
        />

        {/* Color */}
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(245,245,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 10 }}>
          Color
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: c,
                border: color === c ? '3px solid #fff' : '3px solid transparent',
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: 1,
                cursor: 'pointer', padding: 0,
                transition: 'transform 0.1s',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 22,
          border: `1px solid ${color}33`,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: color + '22', border: `1px solid ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1rem', color,
          }}>
            {name[0] || '?'}
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f5f5ff' }}>{name || 'Subject name'}</span>
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
export default function SubjectGrid({ subjects, onSetSubjects, onSelect }) {
  const [showAdd, setShowAdd]     = useState(false);
  const [name, setName]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [editSubject, setEditSubject] = useState(null); // subject being edited

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true); setError('');
    try {
      const color = PALETTE[subjects.length % PALETTE.length];
      const data = await createSubject({ name: name.trim(), color });
      const s = data.subject;
      onSetSubjects(prev => [...prev, { ...s, id: s._id || s.id }]);
      setName(''); setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e, subjectId) => {
    e.stopPropagation();
    if (!confirm('Delete this subject and all its papers?')) return;
    try {
      await deleteSubject(subjectId);
      onSetSubjects(prev => prev.filter(s => String(s.id || s._id) !== String(subjectId)));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditSave = (updated) => {
    onSetSubjects(prev => prev.map(s =>
      String(s.id || s._id) === String(updated.id)
        ? { ...s, name: updated.name, color: updated.color }
        : s
    ));
    setEditSubject(null);
  };

  return (
    <div className={styles.fadeIn}>
      {editSubject && (
        <EditSubjectModal
          subject={editSubject}
          onSave={handleEditSave}
          onClose={() => setEditSubject(null)}
        />
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Subjects</h1>
          <p className={styles.pageSubtitle}>{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
        </div>
        <PrimaryButton onClick={() => setShowAdd(true)}>{PLUS_ICON} Add subject</PrimaryButton>
      </div>

      {showAdd && (
        <div className={styles.addRow}>
          <input className={styles.textInput} placeholder="Subject name" value={name} autoFocus
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} style={{ width: 220 }} />
          <PrimaryButton onClick={add} disabled={saving}>{saving ? 'Adding…' : 'Add'}</PrimaryButton>
          <GhostButton onClick={() => { setShowAdd(false); setName(''); setError(''); }}>Cancel</GhostButton>
          {error && <span style={{ color: '#ef4444', fontSize: '0.78rem' }}>{error}</span>}
        </div>
      )}

      <div className={styles.subjectGrid}>
        {subjects.map(s => (
          <div
            key={s.id || s._id}
            className={styles.subjectCard}
            onClick={() => onSelect(s)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onSelect(s)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.subjectAccent} style={{ background: s.color }} />
            <div className={styles.subjectCardBody}>
              <div className={styles.subjectInitial} style={{ background: s.color + '1a', color: s.color }}>{s.name[0]}</div>
              <div className={styles.subjectInfo}>
                <div className={styles.subjectName}>{s.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', marginTop: 2 }}>
                  <span style={{ fontSize: '0.73rem', color: 'rgba(245,245,255,0.35)', whiteSpace: 'nowrap' }}>
                    {s.papers} paper{s.papers !== 1 ? 's' : ''} · {s.enrolled || 0} student{(s.enrolled || 0) !== 1 ? 's' : ''}
                  </span>
                  {(s.pendingRequests || 0) > 0 && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b',
                      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)',
                      borderRadius: 20, padding: '1px 7px', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {s.pendingRequests} pending
                    </span>
                  )}
                </div>
                {s.joinCode && (
                  <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(245,245,255,0.25)' }}>Join:</span>
                    <span
                      className={styles.codeChip}
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.joinCode); }}
                      title="Click to copy"
                      style={{ cursor: 'pointer', letterSpacing: '0.1em' }}
                    >{s.joinCode}</span>
                  </div>
                )}
              </div>

              {/* Edit button */}
              <button
                onClick={e => { e.stopPropagation(); setEditSubject(s); }}
                title="Edit subject"
                style={{ background: 'none', border: 'none', color: 'rgba(245,245,255,0.2)', cursor: 'pointer', padding: 4, marginRight: 2 }}
              >
                {EDIT_ICON}
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => remove(e, s.id || s._id)}
                title="Delete subject"
                style={{ background: 'none', border: 'none', color: 'rgba(245,245,255,0.2)', cursor: 'pointer', padding: 4, marginRight: 4 }}
              >
                {TRASH_ICON}
              </button>

              <svg className={styles.subjectArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        ))}
        {subjects.length === 0 && <EmptyState icon={GRID_ICON} text="No subjects yet" />}
      </div>
    </div>
  );
}

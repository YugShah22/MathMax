'use client';
import { useState } from 'react';
import { createSubject, deleteSubject } from '@/app/lib/api';
import EmptyState from '@/app/components/ui/EmptyState';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/shared/dashboard.module.css';

const PALETTE = ['#7c3aed','#0ea5e9','#ec4899','#f59e0b','#10b981'];

const GRID_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const PLUS_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TRASH_ICON = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;

export default function SubjectGrid({ subjects, onSetSubjects, onSelect }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
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

  return (
    <div className={styles.fadeIn}>
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
                <div className={styles.subjectMeta}>
                  {s.papers} paper{s.papers !== 1 ? 's' : ''} · {s.enrolled || 0} students
                  {(s.pendingRequests || 0) > 0 && (
                    <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 4 }}>· {s.pendingRequests} pending</span>
                  )}
                </div>
                {s.joinCode && (
                  <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(245,245,255,0.25)' }}>Join:</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.joinCode); }}
                      title="Click to copy"
                      style={{
                        fontFamily: "'JetBrains Mono',monospace", fontSize: '0.72rem', fontWeight: 700,
                        color: '#67e8f9', letterSpacing: '0.12em', cursor: 'pointer',
                        background: 'rgba(103,232,249,0.08)', padding: '1px 7px', borderRadius: 5,
                        border: '1px solid rgba(103,232,249,0.15)',
                      }}
                    >{s.joinCode}</span>
                  </div>
                )}
              </div>
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

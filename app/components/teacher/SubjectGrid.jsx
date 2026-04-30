'use client';
import { useState } from 'react';
import EmptyState from '@/app/components/ui/EmptyState';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/dashboard.module.css';
import { PALETTE } from '@/app/lib/mockData';

const GRID_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const PLUS_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

export default function SubjectGrid({ subjects, onSetSubjects, onSelect }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName]       = useState('');

  const add = () => {
    if (!name.trim()) return;
    onSetSubjects(prev => [...prev, { id: Date.now(), name: name.trim(), papers: 0, color: PALETTE[prev.length % PALETTE.length] }]);
    setName(''); setShowAdd(false);
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
          <PrimaryButton onClick={add}>Add</PrimaryButton>
          <GhostButton onClick={() => { setShowAdd(false); setName(''); }}>Cancel</GhostButton>
        </div>
      )}

      <div className={styles.subjectGrid}>
        {subjects.map(s => (
          <button key={s.id} className={styles.subjectCard} onClick={() => onSelect(s)}>
            <div className={styles.subjectAccent} style={{ background: s.color }} />
            <div className={styles.subjectCardBody}>
              <div className={styles.subjectInitial} style={{ background: s.color + '1a', color: s.color }}>{s.name[0]}</div>
              <div className={styles.subjectInfo}>
                <div className={styles.subjectName}>{s.name}</div>
                <div className={styles.subjectMeta}>{s.papers} paper{s.papers !== 1 ? 's' : ''}</div>
              </div>
              <svg className={styles.subjectArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </button>
        ))}
        {subjects.length === 0 && <EmptyState icon={GRID_ICON} text="No subjects yet" />}
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { scoreColor } from '@/app/lib/deadlineUtils';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/dashboard.module.css';

const Q_FULL = [10,10,10,10,10,10,10,10,10,10];

/** Teacher can override AI marks per question and save. */
export default function SheetDetail({ paper, subject, sheet, onBack }) {
  const base    = [8,7,6,9,7,10,8,9,10,10]; // mock AI scores for this student
  const [marks, setMarks] = useState(base);
  const [saved, setSaved] = useState(false);

  const total   = marks.reduce((a, b) => a + b, 0);
  const fullMks = Q_FULL.reduce((a, b) => a + b, 0);
  const col     = scoreColor((total / fullMks) * 100);

  const update = (i, val) => {
    const v = Math.max(0, Math.min(Q_FULL[i], Number(val)));
    setMarks(prev => { const n = [...prev]; n[i] = v; return n; });
    setSaved(false);
  };

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.subjectBadge} style={{ background: subject.color + '1a', color: subject.color, borderColor: subject.color + '44' }}>{subject.name}</div>
          <h1 className={styles.pageTitle}>Student {String(sheet.index + 1).padStart(2, '0')}</h1>
          <p className={styles.pageSubtitle}>{paper.title}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.8rem', fontWeight: 900, color: col, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', marginTop: 2 }}>out of {fullMks}</div>
        </div>
      </div>

      <div className={styles.formCard} style={{ maxWidth: 620 }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', margin: 0 }}>
          AI-assigned marks shown below. Override any question mark and save.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {marks.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.78rem', color: 'rgba(245,245,255,0.35)', width: 32 }}>Q{i + 1}</span>
              <div className={styles.scoreBarTrack} style={{ flex: 1, height: 6 }}>
                <div className={styles.scoreBarFill} style={{ width: `${(m / Q_FULL[i]) * 100}%`, background: scoreColor((m / Q_FULL[i]) * 100) }} />
              </div>
              <input
                type="number" min={0} max={Q_FULL[i]} value={m}
                onChange={e => update(i, e.target.value)}
                style={{
                  width: 52, padding: '5px 8px', borderRadius: 7,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f5f5ff', fontSize: '0.85rem', fontFamily: "'JetBrains Mono',monospace",
                  textAlign: 'center', outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.28)', width: 28 }}>/{Q_FULL[i]}</span>
            </div>
          ))}
        </div>

        <div className={styles.formActions}>
          <GhostButton onClick={onBack}>Back to sheets</GhostButton>
          <PrimaryButton onClick={() => setSaved(true)}>
            {saved ? '✓ Saved' : 'Save marks'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

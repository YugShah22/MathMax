'use client';
import { useState } from 'react';
import { updateMarks } from '@/app/lib/api';
import { scoreColor } from '@/app/lib/deadlineUtils';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import styles from '@/app/components/shared/dashboard.module.css';

/** Teacher can override AI marks per question and save to DB. */
export default function SheetDetail({ paper, subject, sheet, onBack }) {
  // sheet now comes from real DB: { id, studentName, score, qBreakdown, feedback }
  const initialMarks = (sheet.qBreakdown || []).map(q => ({ got: q.got, full: q.full }));
  const [marks, setMarks] = useState(initialMarks.length > 0 ? initialMarks : Array.from({ length: 10 }, () => ({ got: 7, full: 10 })));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const total   = marks.reduce((a, q) => a + q.got, 0);
  const fullMks = marks.reduce((a, q) => a + q.full, 0);
  const pct     = fullMks > 0 ? (total / fullMks) * 100 : 0;
  const col     = scoreColor(pct);

  const update = (i, val) => {
    const v = Math.max(0, Math.min(marks[i].full, Number(val)));
    setMarks(prev => { const n = [...prev]; n[i] = { ...n[i], got: v }; return n; });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateMarks(sheet.id, marks);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.subjectBadge} style={{ background: subject.color + '1a', color: subject.color, borderColor: subject.color + '44' }}>{subject.name}</div>
          <h1 className={styles.pageTitle}>{sheet.studentName || 'Student'}</h1>
          <p className={styles.pageSubtitle}>{paper.title}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.8rem', fontWeight: 900, color: col, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', marginTop: 2 }}>out of {fullMks}</div>
        </div>
      </div>

      {sheet.feedback && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 18, fontSize: '0.82rem',
          color: 'rgba(245,245,255,0.5)', lineHeight: 1.6, fontStyle: 'italic',
        }}>
          "{sheet.feedback}"
        </div>
      )}

      <div className={styles.formCard} style={{ maxWidth: 620 }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', margin: 0 }}>
          AI-assigned marks shown below. Override any question mark and save.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {marks.map((q, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.78rem', color: 'rgba(245,245,255,0.35)', width: 32 }}>Q{i + 1}</span>
              <div className={styles.scoreBarTrack} style={{ flex: 1, height: 6 }}>
                <div className={styles.scoreBarFill} style={{ width: `${(q.got / q.full) * 100}%`, background: scoreColor((q.got / q.full) * 100) }} />
              </div>
              <input
                type="number" min={0} max={q.full} value={q.got}
                onChange={e => update(i, e.target.value)}
                style={{
                  width: 52, padding: '5px 8px', borderRadius: 7,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f5f5ff', fontSize: '0.85rem', fontFamily: "'JetBrains Mono',monospace",
                  textAlign: 'center', outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.28)', width: 28 }}>/{q.full}</span>
            </div>
          ))}
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>}

        <div className={styles.formActions}>
          <GhostButton onClick={onBack}>Back to sheets</GhostButton>
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save marks'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

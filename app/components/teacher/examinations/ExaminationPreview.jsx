'use client';
import { useState, useEffect } from 'react';
import { PrimaryButton, GhostButton, SmOutlineButton } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import {
  getExamination,
  getQuestions,
  getAnswerKeysForExam,
  checkPublishReadiness,
  publishExamination,
} from '@/app/lib/api';

export default function ExaminationPreview({
  exam,
  onBack,
  onManageQuestions,
  onPublished,
  showToast,
}) {
  const [currentExam, setCurrentExam] = useState(exam);
  const [questions, setQuestions] = useState([]);
  const [answerKeys, setAnswerKeys] = useState([]);
  const [readiness, setReadiness] = useState({ can_publish: false, reasons: [] });
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, qData, akData, checkData] = await Promise.all([
        getExamination(exam.id).catch(() => exam),
        getQuestions(exam.id).catch(() => ({ questions: [] })),
        getAnswerKeysForExam(exam.id).catch(() => []),
        checkPublishReadiness(exam.id).catch(() => ({ can_publish: false, reasons: ['Unable to verify readiness.'] })),
      ]);
      setCurrentExam(eData);
      setQuestions(qData?.questions || []);
      setAnswerKeys(Array.isArray(akData) ? akData : []);
      setReadiness(checkData);
    } catch (err) {
      console.error('Failed to load examination preview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [exam.id]);

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this examination? Students will be able to see the paper and submit answer sheets.')) return;
    setPublishing(true);
    try {
      const published = await publishExamination(exam.id);
      showToast?.('Examination successfully published!');
      setCurrentExam(published);
      onPublished?.(published);
    } catch (err) {
      console.error('Publish failed:', err);
      showToast?.(err.message || 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  };

  const isPublished = currentExam.status === 'published';
  const totalAllocated = questions.reduce((sum, q) => sum + (Number(q.maximum_marks) || 0), 0);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 999,
              fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa',
              background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
            }}>
              {currentExam.subject}
            </span>
            <Badge
              label={currentExam.status}
              color={isPublished ? '#34d399' : '#fbbf24'}
              bg={isPublished ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)'}
              border={isPublished ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'}
            />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '4px 0 0', color: '#f8fafc' }}>
            {currentExam.title} — Review & Publish
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <GhostButton onClick={onBack}>← Back</GhostButton>
          <SmOutlineButton onClick={() => onManageQuestions(currentExam)}>
            Edit Questions & Rubrics
          </SmOutlineButton>
          {!isPublished && (
            <PrimaryButton
              disabled={!readiness.can_publish || publishing || loading}
              onClick={handlePublish}
            >
              {publishing ? 'Publishing…' : 'Publish Examination'}
            </PrimaryButton>
          )}
        </div>
      </div>

      {/* ── Readiness Verification Box ── */}
      {!isPublished && (
        <div style={{
          padding: '16px 20px', borderRadius: 12,
          background: readiness.can_publish ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
          border: readiness.can_publish ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(239,68,68,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: '1.1rem' }}>{readiness.can_publish ? '✓' : '⚠'}</span>
            <strong style={{ fontSize: '0.95rem', color: readiness.can_publish ? '#34d399' : '#f87171' }}>
              {readiness.can_publish ? 'Examination is Complete and Ready to Publish' : 'Validation Checks Preventing Publication'}
            </strong>
          </div>
          {readiness.reasons.length > 0 && (
            <ul style={{ margin: '6px 0 0 20px', padding: 0, fontSize: '0.82rem', color: 'rgba(245,245,255,0.7)' }}>
              {readiness.reasons.map((r, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Overview Card ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#c4b5fd', fontWeight: 600 }}>
          Examination Metadata
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, fontSize: '0.85rem' }}>
          <div>
            <div style={{ color: 'rgba(245,245,255,0.4)', fontSize: '0.74rem', textTransform: 'uppercase' }}>Subject</div>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>{currentExam.subject}</div>
          </div>
          <div>
            <div style={{ color: 'rgba(245,245,255,0.4)', fontSize: '0.74rem', textTransform: 'uppercase' }}>Duration</div>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>{currentExam.duration_minutes} minutes</div>
          </div>
          <div>
            <div style={{ color: 'rgba(245,245,255,0.4)', fontSize: '0.74rem', textTransform: 'uppercase' }}>Total Marks</div>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>{currentExam.total_marks} marks</div>
          </div>
          <div>
            <div style={{ color: 'rgba(245,245,255,0.4)', fontSize: '0.74rem', textTransform: 'uppercase' }}>Type</div>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: 2, textTransform: 'capitalize' }}>
              {currentExam.examination_type?.replace('_', ' ')}
            </div>
          </div>
          <div>
            <div style={{ color: 'rgba(245,245,255,0.4)', fontSize: '0.74rem', textTransform: 'uppercase' }}>Academic Year</div>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>{currentExam.academic_year || '—'}</div>
          </div>
          <div>
            <div style={{ color: 'rgba(245,245,255,0.4)', fontSize: '0.74rem', textTransform: 'uppercase' }}>Scheduled Date</div>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>
              {currentExam.scheduled_at ? new Date(currentExam.scheduled_at).toLocaleString() : 'Not scheduled'}
            </div>
          </div>
        </div>

        {currentExam.description && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <div style={{ color: 'rgba(245,245,255,0.4)', fontSize: '0.74rem', textTransform: 'uppercase', marginBottom: 4 }}>
              Guidelines / Instructions
            </div>
            <div style={{ fontSize: '0.84rem', color: 'rgba(245,245,255,0.7)', lineHeight: 1.4 }}>
              {currentExam.description}
            </div>
          </div>
        )}
      </div>

      {/* ── Question Scheme & Rubric Coverage Table ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#c4b5fd', fontWeight: 600 }}>
            Question Scheme & Rubric Coverage ({questions.length} Questions)
          </h3>
          <span style={{ fontSize: '0.82rem', fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>
            Allocated: {totalAllocated} / {currentExam.total_marks} Marks
          </span>
        </div>

        {questions.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'rgba(245,245,255,0.3)', fontSize: '0.85rem' }}>
            No questions configured. Add questions to enable publishing.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map(q => {
              const hasAnswerKey = answerKeys.some(ak => ak.question_id === q.id);
              return (
                <div
                  key={q.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 100px 100px 70px', gap: 12,
                    alignItems: 'center', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px',
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace" }}>
                    Q{q.question_number}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.86rem', color: '#f8fafc', fontWeight: 500 }}>
                      {q.question_text.slice(0, 90)}{q.question_text.length > 90 ? '…' : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.38)', marginTop: 2 }}>
                      {q.topic ? `${q.topic} • ` : ''}{q.question_type} • {q.difficulty}
                    </div>
                  </div>
                  <div>
                    <Badge
                      label={hasAnswerKey ? 'Key Added' : 'No Key'}
                      color={hasAnswerKey ? '#34d399' : '#94a3b8'}
                      bg={hasAnswerKey ? 'rgba(52,211,153,0.1)' : 'rgba(148,163,184,0.1)'}
                      border={hasAnswerKey ? 'rgba(52,211,153,0.25)' : 'rgba(148,163,184,0.25)'}
                    />
                  </div>
                  <div>
                    <Badge
                      label="Configured"
                      color="#c084fc"
                      bg="rgba(192,132,252,0.1)"
                      border="rgba(192,132,252,0.25)"
                    />
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>
                    {q.maximum_marks} mks
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


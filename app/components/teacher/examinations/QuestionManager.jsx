'use client';
import { useState, useEffect } from 'react';
import { PrimaryButton, GhostButton, SmOutlineButton, SmPurpleButton } from '@/app/components/ui/Button';
import EmptyState from '@/app/components/ui/EmptyState';
import AnswerKeyModal from './AnswerKeyModal';
import RubricBuilder from './RubricBuilder';
import {
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  duplicateQuestion,
} from '@/app/lib/api';

const QUESTION_TYPES = [
  { value: 'mathematical', label: 'Mathematical' },
  { value: 'algebraic', label: 'Algebraic' },
  { value: 'equation', label: 'Equation' },
  { value: 'numerical', label: 'Numerical' },
  { value: 'other', label: 'Other' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: '#34d399' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'hard', label: 'Hard', color: '#f87171' },
];

export default function QuestionManager({
  exam,
  onBack,
  onPreview,
  showToast,
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [qModalOpen, setQModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedForAnswerKey, setSelectedForAnswerKey] = useState(null);
  const [selectedForRubric, setSelectedForRubric] = useState(null);

  // Form states for Add/Edit question
  const [qNum, setQNum] = useState(1);
  const [qText, setQText] = useState('');
  const [qMarks, setQMarks] = useState(5);
  const [qType, setQType] = useState('mathematical');
  const [qTopic, setQTopic] = useState('');
  const [qDiff, setQDiff] = useState('medium');
  const [savingQ, setSavingQ] = useState(false);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await getQuestions(exam.id);
      setQuestions(data?.questions || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
      showToast?.(err.message || 'Error loading questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [exam.id]);

  const openAddModal = () => {
    setEditingQuestion(null);
    setQNum(questions.length + 1);
    setQText('');
    const remaining = Math.max(1, exam.total_marks - totalAllocatedMarks);
    setQMarks(remaining);
    setQType('mathematical');
    setQTopic('');
    setQDiff('medium');
    setQModalOpen(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setQNum(q.question_number);
    setQText(q.question_text);
    setQMarks(q.maximum_marks);
    setQType(q.question_type);
    setQTopic(q.topic || '');
    setQDiff(q.difficulty);
    setQModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!qText.trim()) {
      setError('Question text is required.');
      return;
    }
    if (Number(qMarks) <= 0) {
      setError('Marks must be greater than 0.');
      return;
    }

    setSavingQ(true);
    setError('');
    try {
      const payload = {
        question_number: Number(qNum),
        question_text: qText.trim(),
        maximum_marks: Number(qMarks),
        question_type: qType,
        topic: qTopic.trim(),
        difficulty: qDiff,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
        showToast?.(`Question ${qNum} updated.`);
      } else {
        await addQuestion(exam.id, payload);
        showToast?.(`Question ${qNum} added.`);
      }
      setQModalOpen(false);
      loadQuestions();
    } catch (err) {
      console.error('Failed to save question:', err);
      setError(err.message || 'Failed to save question.');
    } finally {
      setSavingQ(false);
    }
  };

  const handleDelete = async (q) => {
    if (!window.confirm(`Delete Question ${q.question_number}? Any associated answer keys and rubrics will also be affected.`)) return;
    try {
      await deleteQuestion(q.id);
      showToast?.(`Question ${q.question_number} deleted.`);
      loadQuestions();
    } catch (err) {
      showToast?.(err.message || 'Delete failed');
    }
  };

  const handleDuplicate = async (q) => {
    const nextNum = questions.length + 1;
    try {
      await duplicateQuestion(q.id, nextNum);
      showToast?.(`Duplicated as Question ${nextNum}`);
      loadQuestions();
    } catch (err) {
      showToast?.(err.message || 'Duplicate failed');
    }
  };

  const handleMove = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const reordered = [...questions];
    const temp = reordered[idx];
    reordered[idx] = reordered[target];
    reordered[target] = temp;

    const payload = reordered.map((q, i) => ({
      question_id: q.id,
      question_number: i + 1,
    }));

    try {
      await reorderQuestions(exam.id, payload);
      loadQuestions();
    } catch (err) {
      showToast?.(err.message || 'Reorder failed');
    }
  };

  const totalAllocatedMarks = questions.reduce((sum, q) => sum + (Number(q.maximum_marks) || 0), 0);
  const diffMarks = exam.total_marks - totalAllocatedMarks;
  const isMarksBalanced = Math.abs(diffMarks) < 0.001;

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#f8fafc', fontSize: '0.85rem', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.74rem', fontWeight: 600,
    color: 'rgba(245,245,255,0.45)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 999,
              fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa',
              background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
            }}>
              {exam.subject}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(245,245,255,0.4)' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.45)' }}>{exam.duration_minutes} Mins</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '4px 0 0', color: '#f8fafc' }}>
            {exam.title} — Questions & Rubrics
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <GhostButton onClick={onBack}>← Back to Exams</GhostButton>
          <SmOutlineButton onClick={onPreview}>Preview & Validate</SmOutlineButton>
          <PrimaryButton onClick={openAddModal}>+ Add Question</PrimaryButton>
        </div>
      </div>

      {/* ── Marks Progress Summary Banner ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px', borderRadius: 12,
        background: isMarksBalanced ? 'rgba(52,211,153,0.06)' : 'rgba(251,191,36,0.06)',
        border: isMarksBalanced ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(251,191,36,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.45)', textTransform: 'uppercase', fontWeight: 600 }}>Allocated Marks:</span>
            <div style={{
              fontSize: '1.35rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              color: isMarksBalanced ? '#34d399' : '#fbbf24',
            }}>
              {totalAllocatedMarks.toFixed(1)} / {exam.total_marks}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 16 }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.45)', textTransform: 'uppercase', fontWeight: 600 }}>Total Questions:</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>
              {questions.length}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
          {isMarksBalanced ? (
            <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Question marks match examination total. Ready to publish!</span>
          ) : diffMarks > 0 ? (
            <span style={{ color: '#fbbf24' }}>{diffMarks.toFixed(1)} marks left to allocate across questions.</span>
          ) : (
            <span style={{ color: '#f87171', fontWeight: 600 }}>Exceeds exam total by {Math.abs(diffMarks).toFixed(1)} marks! Adjust question marks.</span>
          )}
        </div>
      </div>

      {/* ── Questions List ── */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(245,245,255,0.3)' }}>
          Loading questions…
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          text="No questions added yet. Click '+ Add Question' to start creating your question paper and rubrics."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((q, idx) => {
            const diffColor = DIFFICULTIES.find(d => d.value === q.difficulty)?.color || '#fbbf24';
            return (
              <div
                key={q.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '16px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  gap: 16, flexWrap: 'wrap',
                }}
              >
                {/* Left side: Question content */}
                <div style={{ display: 'flex', gap: 14, flex: '1 1 360px' }}>
                  <div style={{
                    minWidth: 38, height: 38, borderRadius: 10,
                    background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#c4b5fd', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    Q{q.question_number}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: diffColor, textTransform: 'capitalize' }}>
                        ● {q.difficulty}
                      </span>
                      {q.topic && (
                        <span style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>
                          {q.topic}
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: 'rgba(245,245,255,0.4)', textTransform: 'capitalize' }}>
                        {q.question_type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', color: '#f8fafc', lineHeight: 1.4, fontWeight: 500 }}>
                      {q.question_text}
                    </div>
                  </div>
                </div>

                {/* Right side: Marks + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right', minWidth: 70 }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace" }}>
                      {q.maximum_marks}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(245,245,255,0.4)' }}>marks</div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <SmPurpleButton onClick={() => setSelectedForRubric(q)}>
                      Rubric
                    </SmPurpleButton>
                    <SmOutlineButton onClick={() => setSelectedForAnswerKey(q)}>
                      Answer Key
                    </SmOutlineButton>
                    <SmOutlineButton onClick={() => openEditModal(q)}>
                      Edit
                    </SmOutlineButton>
                    <SmOutlineButton onClick={() => handleDuplicate(q)} title="Duplicate">
                      Copy
                    </SmOutlineButton>

                    {/* Move controls */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, -1)}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 6, color: '#e2e8f0', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        padding: '4px 8px', fontSize: '0.72rem',
                      }}
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1}
                      onClick={() => handleMove(idx, 1)}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 6, color: '#e2e8f0', cursor: idx === questions.length - 1 ? 'not-allowed' : 'pointer',
                        padding: '4px 8px', fontSize: '0.72rem',
                      }}
                      title="Move down"
                    >
                      ▼
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(q)}
                      style={{
                        background: 'transparent', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 6, color: '#f87171', cursor: 'pointer',
                        padding: '4px 8px', fontSize: '0.75rem',
                      }}
                      title="Delete question"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Question Modal ── */}
      {qModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <form
            onSubmit={handleSaveQuestion}
            style={{
              background: '#090d16', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, width: '100%', maxWidth: 560, padding: 24,
              display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 600 }}>
                {editingQuestion ? `Edit Question ${qNum}` : 'Add New Question'}
              </h2>
              <button
                type="button"
                onClick={() => setQModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(245,245,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div style={{
                padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: '0.8rem',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Question Number *</label>
                <input
                  type="number"
                  min="1"
                  value={qNum}
                  onChange={e => setQNum(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Maximum Marks *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={qMarks}
                  onChange={e => setQMarks(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Question Text / Problem Statement *</label>
              <textarea
                rows={4}
                value={qText}
                onChange={e => setQText(e.target.value)}
                placeholder="Enter mathematical problem, e.g. Solve the initial value problem dy/dx = 2x with y(0) = 4..."
                style={{ ...inputStyle, resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Question Type</label>
                <select
                  value={qType}
                  onChange={e => setQType(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {QUESTION_TYPES.map(t => (
                    <option key={t.value} value={t.value} style={{ background: '#0f172a' }}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Difficulty Level</label>
                <select
                  value={qDiff}
                  onChange={e => setQDiff(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {DIFFICULTIES.map(d => (
                    <option key={d.value} value={d.value} style={{ background: '#0f172a' }}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Topic / Sub-topic (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Calculus, Linear Algebra, Integration"
                value={qTopic}
                onChange={e => setQTopic(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <GhostButton type="button" onClick={() => setQModalOpen(false)}>Cancel</GhostButton>
              <PrimaryButton disabled={savingQ} type="submit">
                {savingQ ? 'Saving…' : (editingQuestion ? 'Save Changes' : 'Add Question')}
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}

      {/* Answer Key Modal */}
      {selectedForAnswerKey && (
        <AnswerKeyModal
          question={selectedForAnswerKey}
          onClose={() => setSelectedForAnswerKey(null)}
          showToast={showToast}
        />
      )}

      {/* Rubric Builder Modal */}
      {selectedForRubric && (
        <RubricBuilder
          question={selectedForRubric}
          onClose={() => setSelectedForRubric(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}


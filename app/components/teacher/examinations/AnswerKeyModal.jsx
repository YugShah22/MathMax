'use client';
import { useState, useEffect } from 'react';
import { PrimaryButton, GhostButton, SmOutlineButton } from '@/app/components/ui/Button';
import { getAnswerKeyForQuestion, createOrUpdateAnswerKey } from '@/app/lib/api';

export default function AnswerKeyModal({
  question,
  onClose,
  showToast,
}) {
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [mathExpression, setMathExpression] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [steps, setSteps] = useState([]);
  const [alternativesText, setAlternativesText] = useState('');
  const [markingNotes, setMarkingNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const ak = await getAnswerKeyForQuestion(question.id);
        if (ak) {
          setExpectedAnswer(ak.expected_answer || '');
          setMathExpression(ak.mathematical_expression || '');
          setFinalAnswer(ak.expected_final_answer || '');
          setSteps(ak.expected_steps || []);
          setAlternativesText((ak.accepted_alternatives || []).join('\n'));
          setMarkingNotes(ak.marking_notes || '');
        } else {
          // Initialize with default step
          setSteps([{ step_number: 1, description: '', expression: '', result: '' }]);
        }
      } catch (err) {
        console.error('Failed to load answer key:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [question.id]);

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { step_number: prev.length + 1, description: '', expression: '', result: '' },
    ]);
  };

  const removeStep = (idx) => {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const updateStep = (idx, field, val) => {
    setSteps(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!expectedAnswer.trim()) {
      setError('Please provide the expected solution overview.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const alternatives = alternativesText
        .split('\n')
        .map(a => a.trim())
        .filter(Boolean);

      const payload = {
        expected_answer: expectedAnswer.trim(),
        mathematical_expression: mathExpression.trim(),
        expected_final_answer: finalAnswer.trim(),
        expected_steps: steps.map(s => ({
          step_number: s.step_number,
          description: s.description.trim(),
          expression: s.expression.trim(),
          result: s.result.trim(),
        })),
        accepted_alternatives: alternatives,
        marking_notes: markingNotes.trim(),
      };

      await createOrUpdateAnswerKey(question.id, payload);
      showToast?.('Answer key saved successfully.');
      onClose();
    } catch (err) {
      console.error('Save answer key failed:', err);
      setError(err.message || 'Failed to save answer key.');
    } finally {
      setSaving(false);
    }
  };

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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#090d16', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 600 }}>
              Answer Key — Question {question.question_number}
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.4)', marginTop: 2 }}>
              {question.question_text.slice(0, 90)}{question.question_text.length > 90 ? '…' : ''} ({question.maximum_marks} marks)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'rgba(245,245,255,0.4)',
              cursor: 'pointer', fontSize: '1.2rem', padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5', fontSize: '0.82rem',
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'rgba(245,245,255,0.3)' }}>Loading answer key…</div>
          ) : (
            <>
              {/* Expected full answer */}
              <div>
                <label style={labelStyle}>Expected Full Solution / Explanation *</label>
                <textarea
                  rows={3}
                  value={expectedAnswer}
                  onChange={e => setExpectedAnswer(e.target.value)}
                  placeholder="Provide complete step-by-step mathematical reasoning..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  required
                />
              </div>

              {/* Mathematical expression & final answer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Primary Math Expression / Formula</label>
                  <input
                    type="text"
                    value={mathExpression}
                    onChange={e => setMathExpression(e.target.value)}
                    placeholder="e.g. 2x + 4 = 10"
                    style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Expected Final Answer / Value</label>
                  <input
                    type="text"
                    value={finalAnswer}
                    onChange={e => setFinalAnswer(e.target.value)}
                    placeholder="e.g. x = 3"
                    style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
              </div>

              {/* Step-by-Step Breakdown */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Solution Steps (Reference for Rubrics)</label>
                  <SmOutlineButton onClick={addStep} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                    + Add Step
                  </SmOutlineButton>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map((st, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 28px', gap: 8,
                        alignItems: 'center', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 8,
                      }}
                    >
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa', textAlign: 'center' }}>
                        #{st.step_number}
                      </span>
                      <input
                        type="text"
                        placeholder="Description (e.g. Subtract 4)"
                        value={st.description}
                        onChange={e => updateStep(i, 'description', e.target.value)}
                        style={inputStyle}
                      />
                      <input
                        type="text"
                        placeholder="Expression (e.g. 2x = 6)"
                        value={st.expression}
                        onChange={e => updateStep(i, 'expression', e.target.value)}
                        style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                      />
                      <input
                        type="text"
                        placeholder="Result (e.g. 6)"
                        value={st.result}
                        onChange={e => updateStep(i, 'result', e.target.value)}
                        style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                      />
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          style={{
                            background: 'transparent', border: 'none', color: '#f87171',
                            cursor: 'pointer', fontSize: '0.9rem',
                          }}
                          title="Remove step"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Accepted alternatives & notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Accepted Alternative Final Answers (one per line)</label>
                  <textarea
                    rows={3}
                    value={alternativesText}
                    onChange={e => setAlternativesText(e.target.value)}
                    placeholder="3&#10;x=3&#10;3.0&#10;+3"
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Teacher Marking Notes (Confidential)</label>
                  <textarea
                    rows={3}
                    value={markingNotes}
                    onChange={e => setMarkingNotes(e.target.value)}
                    placeholder="Special instructions for graders or common student mistakes to check..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <PrimaryButton disabled={saving || loading} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save Answer Key'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}


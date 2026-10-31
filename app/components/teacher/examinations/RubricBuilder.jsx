'use client';
import { useState, useEffect } from 'react';
import { PrimaryButton, GhostButton, SmOutlineButton, SmPurpleButton } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import PartialMarkingConfigModal from './PartialMarkingConfigModal';
import {
  getRubricsForQuestion,
  createRubric,
  updateRubric,
  activateRubric,
  archiveRubric,
  duplicateRubric,
} from '@/app/lib/api';

const CRITERIA_OPTIONS = [
  { value: 'mathematical_equivalence', label: 'Mathematical Equivalence (SymPy / Algebraic)' },
  { value: 'exact_match', label: 'Exact Match' },
  { value: 'numerical_tolerance', label: 'Numerical Tolerance' },
  { value: 'method_validity', label: 'Method / Formula Validity' },
  { value: 'conceptual_criterion', label: 'Conceptual Criterion' },
  { value: 'teacher_review', label: 'Teacher Review Required' },
];

const POLICIES = [
  { value: 'full_marks', label: 'Full Marks on Success' },
  { value: 'partial_marks', label: 'Allow Partial Marks' },
  { value: 'follow_through', label: 'Allow Follow-Through' },
  { value: 'zero_marks', label: 'Strict (All or Nothing)' },
];

export default function RubricBuilder({
  question,
  onClose,
  showToast,
}) {
  const [rubrics, setRubrics] = useState([]);
  const [activeRubric, setActiveRubric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evaluationType, setEvaluationType] = useState('step_wise');
  const [instructions, setInstructions] = useState('');
  const [steps, setSteps] = useState([]);
  const [partialMarking, setPartialMarking] = useState({
    follow_through: { enabled: false, applicable_steps: [], conditions: '', max_eligible_marks: 0, teacher_explanation: '' },
    numerical_tolerance: { absolute_tolerance: 0, relative_tolerance: 0, decimal_precision: 2, rounding_rule: 'round_half_up' },
    alternative_methods: [],
    error_instructions: [],
    requires_teacher_review: false,
  });

  // Partial marking modal state
  const [pmModalOpen, setPmModalOpen] = useState(false);
  const [pmStepIndex, setPmStepIndex] = useState(null); // null = rubric level, number = step level

  const loadRubrics = async () => {
    setLoading(true);
    try {
      const data = await getRubricsForQuestion(question.id);
      const list = data?.rubrics || [];
      setRubrics(list);
      if (list.length > 0) {
        selectRubric(list[0]);
      } else {
        // Initialize with default step
        initNewRubric();
      }
    } catch (err) {
      console.error('Failed to load rubrics:', err);
      initNewRubric();
    } finally {
      setLoading(false);
    }
  };

  const initNewRubric = () => {
    setActiveRubric(null);
    setTitle(`Marking Rubric — Q${question.question_number}`);
    setDescription(`Step-wise mathematical evaluation criteria for Question ${question.question_number}`);
    setEvaluationType('step_wise');
    setInstructions('');
    setSteps([
      {
        step_id: 'temp-1',
        step_number: 1,
        title: 'Step 1: Algebraic Manipulation',
        description: 'Perform initial algebraic simplification / subtraction',
        maximum_marks: Math.min(2, question.maximum_marks),
        evaluation_criteria: 'mathematical_equivalence',
        expected_expression: '',
        expected_result: '',
        accepted_alternatives: [],
        error_tolerance: 0,
        required: true,
        dependency_step_ids: [],
        marking_policy: 'full_marks',
        partial_marks_config: {
          follow_through: { enabled: false, applicable_steps: [], conditions: '', max_eligible_marks: 0, teacher_explanation: '' },
          numerical_tolerance: { absolute_tolerance: 0, relative_tolerance: 0, decimal_precision: 2, rounding_rule: 'round_half_up' },
          alternative_methods: [],
          error_instructions: [],
          requires_teacher_review: false,
        },
      },
    ]);
  };

  const selectRubric = (r) => {
    setActiveRubric(r);
    setTitle(r.title || '');
    setDescription(r.description || '');
    setEvaluationType(r.evaluation_type || 'step_wise');
    setInstructions(r.instructions || '');
    setSteps(r.steps || []);
    setPartialMarking(r.partial_marking || {
      follow_through: { enabled: false, applicable_steps: [], conditions: '', max_eligible_marks: 0, teacher_explanation: '' },
      numerical_tolerance: { absolute_tolerance: 0, relative_tolerance: 0, decimal_precision: 2, rounding_rule: 'round_half_up' },
      alternative_methods: [],
      error_instructions: [],
      requires_teacher_review: false,
    });
  };

  useEffect(() => {
    loadRubrics();
  }, [question.id]);

  // Steps handling
  const addStep = () => {
    const nextNum = steps.length + 1;
    const remaining = Math.max(0.5, question.maximum_marks - currentTotalMarks);
    setSteps(prev => [
      ...prev,
      {
        step_id: `temp-${Date.now()}`,
        step_number: nextNum,
        title: `Step ${nextNum}`,
        description: '',
        maximum_marks: remaining > 0 ? remaining : 1,
        evaluation_criteria: 'mathematical_equivalence',
        expected_expression: '',
        expected_result: '',
        accepted_alternatives: [],
        error_tolerance: 0,
        required: true,
        dependency_step_ids: nextNum > 1 ? [`temp-${nextNum - 1}`] : [],
        marking_policy: 'full_marks',
        partial_marks_config: {
          follow_through: { enabled: false, applicable_steps: [], conditions: '', max_eligible_marks: 0, teacher_explanation: '' },
          numerical_tolerance: { absolute_tolerance: 0, relative_tolerance: 0, decimal_precision: 2, rounding_rule: 'round_half_up' },
          alternative_methods: [],
          error_instructions: [],
          requires_teacher_review: false,
        },
      },
    ]);
  };

  const removeStep = (idx) => {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const moveStep = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    setSteps(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
  };

  const updateStep = (idx, field, val) => {
    setSteps(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  };

  // Live marks sum
  const currentTotalMarks = steps.reduce((acc, s) => acc + (Number(s.maximum_marks) || 0), 0);
  const marksDifference = question.maximum_marks - currentTotalMarks;
  const isMarksValid = Math.abs(marksDifference) < 0.001;
  const isMarksExceeded = currentTotalMarks > question.maximum_marks + 0.001;

  // Save handler
  const handleSave = async (activateImmediately = false) => {
    setError('');
    if (!title.trim()) {
      setError('Rubric title is required.');
      return;
    }
    if (steps.length === 0) {
      setError('At least one rubric step is required.');
      return;
    }
    if (isMarksExceeded) {
      setError(`Total step marks (${currentTotalMarks}) cannot exceed question max marks (${question.maximum_marks}).`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        evaluation_type: evaluationType,
        instructions: instructions.trim(),
        steps: steps.map(s => ({
          step_number: s.step_number,
          title: s.title.trim() || `Step ${s.step_number}`,
          description: s.description.trim(),
          maximum_marks: Number(s.maximum_marks),
          evaluation_criteria: s.evaluation_criteria,
          expected_expression: s.expected_expression.trim(),
          expected_result: s.expected_result.trim(),
          accepted_alternatives: Array.isArray(s.accepted_alternatives) ? s.accepted_alternatives : [],
          error_tolerance: Number(s.error_tolerance || 0),
          required: Boolean(s.required),
          dependency_step_ids: s.dependency_step_ids || [],
          marking_policy: s.marking_policy || 'full_marks',
          partial_marks_config: s.partial_marks_config || {
            follow_through: { enabled: false, applicable_steps: [], conditions: '', max_eligible_marks: 0, teacher_explanation: '' },
            numerical_tolerance: { absolute_tolerance: 0, relative_tolerance: 0, decimal_precision: 2, rounding_rule: 'round_half_up' },
            alternative_methods: [],
            error_instructions: [],
            requires_teacher_review: false,
          },
        })),
        partial_marking: partialMarking,
      };

      let saved;
      if (activeRubric?.id) {
        saved = await updateRubric(activeRubric.id, payload);
      } else {
        saved = await createRubric(question.id, payload);
      }

      if (activateImmediately && saved?.id) {
        saved = await activateRubric(saved.id);
        showToast?.('Rubric activated successfully.');
      } else {
        showToast?.('Rubric saved as draft.');
      }

      await loadRubrics();
    } catch (err) {
      console.error('Failed to save rubric:', err);
      setError(err.message || 'Failed to save rubric.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!activeRubric?.id) return;
    if (!window.confirm('Archive this rubric version?')) return;
    try {
      await archiveRubric(activeRubric.id);
      showToast?.('Rubric archived.');
      loadRubrics();
    } catch (err) {
      showToast?.(err.message || 'Archive failed');
    }
  };

  const handleDuplicate = async () => {
    if (!activeRubric?.id) return;
    try {
      const dup = await duplicateRubric(activeRubric.id, question.id);
      showToast?.(`Duplicated as "${dup.title}"`);
      loadRubrics();
    } catch (err) {
      showToast?.(err.message || 'Duplicate failed');
    }
  };

  const inputStyle = {
    width: '100%', padding: '7px 11px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7, color: '#f8fafc', fontSize: '0.82rem', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: 600,
    color: 'rgba(245,245,255,0.45)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#090d16', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, width: '100%', maxWidth: 940, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', fontWeight: 600 }}>
                Step-Wise Rubric Builder
              </h2>
              {activeRubric && (
                <Badge
                  label={activeRubric.status}
                  color={activeRubric.status === 'active' ? '#34d399' : '#fbbf24'}
                  bg={activeRubric.status === 'active' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)'}
                  border={activeRubric.status === 'active' ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'}
                />
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(245,245,255,0.45)', marginTop: 3 }}>
              Question {question.question_number}: {question.question_text.slice(0, 80)}{question.question_text.length > 80 ? '…' : ''} (Max {question.maximum_marks} marks)
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {rubrics.length > 1 && (
              <select
                value={activeRubric?.id || ''}
                onChange={e => {
                  const found = rubrics.find(r => r.id === e.target.value);
                  if (found) selectRubric(found);
                }}
                style={{ ...inputStyle, width: 'auto', padding: '5px 10px', fontSize: '0.78rem' }}
              >
                {rubrics.map(r => (
                  <option key={r.id} value={r.id} style={{ background: '#0f172a' }}>
                    {r.title} (v{r.version} · {r.status})
                  </option>
                ))}
              </select>
            )}
            <SmOutlineButton onClick={initNewRubric} style={{ fontSize: '0.74rem' }}>
              + New Rubric
            </SmOutlineButton>
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
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5', fontSize: '0.82rem',
            }}>
              {error}
            </div>
          )}

          {/* Live Marks Counter Bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 18px', borderRadius: 10,
            background: isMarksExceeded ? 'rgba(239,68,68,0.1)' : (isMarksValid ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)'),
            border: isMarksExceeded ? '1px solid rgba(239,68,68,0.3)' : (isMarksValid ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(251,191,36,0.25)'),
          }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'rgba(245,245,255,0.6)', fontWeight: 600 }}>
                Marks Allocation Check:
              </span>
              <span style={{
                marginLeft: 10, fontSize: '0.95rem', fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                color: isMarksExceeded ? '#f87171' : (isMarksValid ? '#34d399' : '#fbbf24'),
              }}>
                {currentTotalMarks.toFixed(1)} / {question.maximum_marks} marks
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.5)' }}>
              {isMarksExceeded ? (
                <span style={{ color: '#f87171', fontWeight: 600 }}>⚠ Exceeds question maximum by {(currentTotalMarks - question.maximum_marks).toFixed(1)} marks</span>
              ) : isMarksValid ? (
                <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Step marks perfectly match question total</span>
              ) : (
                <span style={{ color: '#fbbf24' }}>{marksDifference.toFixed(1)} marks remaining to allocate</span>
              )}
            </div>
          </div>

          {/* Rubric Meta Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Rubric Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Standard Differentiation Rubric"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Evaluation Type</label>
              <select
                value={evaluationType}
                onChange={e => setEvaluationType(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="step_wise" style={{ background: '#0f172a' }}>Step-Wise (Criteria per step)</option>
                <option value="holistic" style={{ background: '#0f172a' }}>Holistic (Overall impression)</option>
                <option value="hybrid" style={{ background: '#0f172a' }}>Hybrid (Steps + Final answer)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Partial Marking</label>
              <SmOutlineButton
                onClick={() => { setPmStepIndex(null); setPmModalOpen(true); }}
                style={{ width: '100%', justifyContent: 'center', height: 35 }}
              >
                ⚙ Partial Rules & Tolerances
              </SmOutlineButton>
            </div>
          </div>

          {/* Steps Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#c4b5fd', fontWeight: 600 }}>
                Step-Wise Marking Breakdown ({steps.length} Steps)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'rgba(245,245,255,0.38)' }}>
                Define mathematical equivalence checks, intermediate expressions, and marks per step.
              </p>
            </div>
            <SmPurpleButton onClick={addStep}>
              + Add Step
            </SmPurpleButton>
          </div>

          {/* Step Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((st, i) => (
              <div
                key={st.step_id || i}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '16px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                {/* Step Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 800,
                      background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)',
                      color: '#c4b5fd', fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Step #{st.step_number}
                    </span>
                    <input
                      type="text"
                      value={st.title}
                      onChange={e => updateStep(i, 'title', e.target.value)}
                      placeholder="Step Title (e.g. Subtract 4 from both sides)"
                      style={{ ...inputStyle, fontWeight: 600 }}
                    />
                  </div>

                  {/* Marks input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.45)', fontWeight: 600 }}>Marks:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max={question.maximum_marks}
                      value={st.maximum_marks}
                      onChange={e => updateStep(i, 'maximum_marks', e.target.value)}
                      style={{ ...inputStyle, width: 68, textAlign: 'center', fontWeight: 700 }}
                    />
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveStep(i, -1)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#e2e8f0', cursor: i === 0 ? 'not-allowed' : 'pointer', padding: '3px 6px' }}
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={i === steps.length - 1}
                      onClick={() => moveStep(i, 1)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#e2e8f0', cursor: i === steps.length - 1 ? 'not-allowed' : 'pointer', padding: '3px 6px' }}
                      title="Move down"
                    >
                      ▼
                    </button>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, color: '#f87171', cursor: 'pointer', padding: '3px 6px' }}
                        title="Delete step"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Step Configuration Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Evaluation Criteria *</label>
                    <select
                      value={st.evaluation_criteria}
                      onChange={e => updateStep(i, 'evaluation_criteria', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {CRITERIA_OPTIONS.map(c => (
                        <option key={c.value} value={c.value} style={{ background: '#0f172a' }}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Marking Policy</label>
                    <select
                      value={st.marking_policy}
                      onChange={e => updateStep(i, 'marking_policy', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {POLICIES.map(p => (
                        <option key={p.value} value={p.value} style={{ background: '#0f172a' }}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Expected Mathematical Expression</label>
                    <input
                      type="text"
                      placeholder="e.g. 2x = 6"
                      value={st.expected_expression}
                      onChange={e => updateStep(i, 'expected_expression', e.target.value)}
                      style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Expected Result / Target</label>
                    <input
                      type="text"
                      placeholder="e.g. x = 3"
                      value={st.expected_result}
                      onChange={e => updateStep(i, 'expected_result', e.target.value)}
                      style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>
                </div>

                {/* Step Description & Accepted Alternatives */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Step Description & Marking Criteria</label>
                    <input
                      type="text"
                      placeholder="Describe the mathematical reasoning required for full marks..."
                      value={st.description}
                      onChange={e => updateStep(i, 'description', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Accepted Alternative Expressions (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="2x=10-4, 2x-6=0"
                      value={(st.accepted_alternatives || []).join(', ')}
                      onChange={e => updateStep(i, 'accepted_alternatives', e.target.value.split(',').map(a => a.trim()).filter(Boolean))}
                      style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {activeRubric && (
              <>
                <SmOutlineButton onClick={handleDuplicate}>Duplicate</SmOutlineButton>
                {activeRubric.status !== 'archived' && (
                  <SmOutlineButton onClick={handleArchive} style={{ color: '#94a3b8' }}>Archive</SmOutlineButton>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <GhostButton onClick={onClose}>Close</GhostButton>
            <SmOutlineButton disabled={saving} onClick={() => handleSave(false)}>
              Save as Draft
            </SmOutlineButton>
            <PrimaryButton disabled={saving || isMarksExceeded} onClick={() => handleSave(true)}>
              {saving ? 'Activating…' : 'Activate Rubric'}
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Partial Marking Modal */}
      {pmModalOpen && (
        <PartialMarkingConfigModal
          config={pmStepIndex === null ? partialMarking : steps[pmStepIndex]?.partial_marks_config}
          onSave={(cfg) => {
            if (pmStepIndex === null) {
              setPartialMarking(cfg);
            } else {
              updateStep(pmStepIndex, 'partial_marks_config', cfg);
            }
            showToast?.('Partial marking rules updated.');
          }}
          onClose={() => setPmModalOpen(false)}
        />
      )}
    </div>
  );
}


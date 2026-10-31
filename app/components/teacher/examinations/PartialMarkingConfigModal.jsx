'use client';
import { useState } from 'react';
import { PrimaryButton, GhostButton, SmOutlineButton } from '@/app/components/ui/Button';

const ERROR_TYPES = [
  { value: 'calculation', label: 'Calculation / Arithmetic Error' },
  { value: 'sign', label: 'Sign Error (+/-)' },
  { value: 'substitution', label: 'Substitution / Variable Error' },
  { value: 'conceptual', label: 'Conceptual Error' },
  { value: 'method', label: 'Method / Formula Error' },
];

const POLICIES = [
  { value: 'partial_marks', label: 'Award Partial Marks (with deduction)' },
  { value: 'zero_marks', label: 'Zero Marks for this step' },
  { value: 'follow_through', label: 'Award Follow-Through Marks' },
  { value: 'teacher_review', label: 'Flag for Teacher Review' },
];

export default function PartialMarkingConfigModal({
  config,
  onSave,
  onClose,
}) {
  const [ftEnabled, setFtEnabled] = useState(config?.follow_through?.enabled || false);
  const [ftSteps, setFtSteps] = useState((config?.follow_through?.applicable_steps || []).join(', '));
  const [ftConditions, setFtConditions] = useState(config?.follow_through?.conditions || '');
  const [ftMaxMarks, setFtMaxMarks] = useState(config?.follow_through?.max_eligible_marks || 0);
  const [ftExplanation, setFtExplanation] = useState(config?.follow_through?.teacher_explanation || '');

  // Numerical tolerance
  const [absTol, setAbsTol] = useState(config?.numerical_tolerance?.absolute_tolerance || 0);
  const [relTol, setRelTol] = useState(config?.numerical_tolerance?.relative_tolerance || 0);
  const [decPrecision, setDecPrecision] = useState(config?.numerical_tolerance?.decimal_precision || 2);
  const [roundingRule, setRoundingRule] = useState(config?.numerical_tolerance?.rounding_rule || 'round_half_up');

  // Alternative methods
  const [altMethods, setAltMethods] = useState(config?.alternative_methods || []);

  // Error instructions
  const [errorInstructions, setErrorInstructions] = useState(config?.error_instructions || []);

  // Review flag
  const [requiresReview, setRequiresReview] = useState(config?.requires_teacher_review || false);

  const addAltMethod = () => {
    setAltMethods(prev => [
      ...prev,
      { description: '', expected_result: '', accepted_expressions: [] },
    ]);
  };

  const removeAltMethod = (i) => {
    setAltMethods(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateAltMethod = (i, field, val) => {
    setAltMethods(prev => prev.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)));
  };

  const addErrorInstruction = () => {
    setErrorInstructions(prev => [
      ...prev,
      { error_type: 'calculation', instruction: '', marking_policy: 'partial_marks', max_marks_deducted: 0.5 },
    ]);
  };

  const removeErrorInstruction = (i) => {
    setErrorInstructions(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateErrorInstruction = (i, field, val) => {
    setErrorInstructions(prev => prev.map((e, idx) => (idx === i ? { ...e, [field]: val } : e)));
  };

  const handleApply = () => {
    const stepsArr = ftSteps
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    const finalConfig = {
      follow_through: {
        enabled: ftEnabled,
        applicable_steps: stepsArr,
        conditions: ftConditions.trim(),
        max_eligible_marks: Number(ftMaxMarks),
        teacher_explanation: ftExplanation.trim(),
      },
      numerical_tolerance: {
        absolute_tolerance: Number(absTol),
        relative_tolerance: Number(relTol),
        decimal_precision: Number(decPrecision),
        rounding_rule: roundingRule,
      },
      alternative_methods: altMethods.map(m => ({
        description: m.description.trim(),
        expected_result: m.expected_result.trim(),
        accepted_expressions: Array.isArray(m.accepted_expressions) ? m.accepted_expressions : [],
      })),
      error_instructions: errorInstructions.map(e => ({
        error_type: e.error_type,
        instruction: e.instruction.trim(),
        marking_policy: e.marking_policy,
        max_marks_deducted: Number(e.max_marks_deducted || 0),
      })),
      requires_teacher_review: requiresReview,
    };

    onSave(finalConfig);
    onClose();
  };

  const inputStyle = {
    width: '100%', padding: '7px 10px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7, color: '#f8fafc', fontSize: '0.82rem', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: 600,
    color: 'rgba(245,245,255,0.45)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 110,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#090d16', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 600 }}>
              Partial-Marking Instructions & Tolerances
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.4)', marginTop: 2 }}>
              Configure follow-through rules, numerical precision, error policies, and alternative methods
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
        <div style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Section 1: Follow-Through Marking */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#c4b5fd', fontWeight: 600 }}>
                  1. Follow-Through (Consequential) Marks
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(245,245,255,0.38)' }}>
                  Award marks if a student applies correct logic to an earlier arithmetic slip.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', color: '#e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={ftEnabled}
                  onChange={e => setFtEnabled(e.target.checked)}
                  style={{ accentColor: '#7c3aed' }}
                />
                Enabled
              </label>
            </div>

            {ftEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <div>
                  <label style={labelStyle}>Applicable Step Numbers (comma separated)</label>
                  <input
                    type="text"
                    value={ftSteps}
                    onChange={e => setFtSteps(e.target.value)}
                    placeholder="e.g. 2, 3, 4"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Max Eligible Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={ftMaxMarks}
                    onChange={e => setFtMaxMarks(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Follow-Through Conditions / Explanation</label>
                  <input
                    type="text"
                    value={ftConditions}
                    onChange={e => setFtConditions(e.target.value)}
                    placeholder="e.g. If Step 1 arithmetic is wrong but derivative in Step 2 is correct, award step 2 marks"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Numerical Tolerance */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#c4b5fd', fontWeight: 600 }}>
              2. Numerical Tolerance & Precision
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <div>
                <label style={labelStyle}>Absolute Tolerance (±)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={absTol}
                  onChange={e => setAbsTol(e.target.value)}
                  placeholder="0.01"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Relative Tolerance (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={relTol}
                  onChange={e => setRelTol(e.target.value)}
                  placeholder="0.05 (5%)"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Decimal Places</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={decPrecision}
                  onChange={e => setDecPrecision(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Rounding Rule</label>
                <select
                  value={roundingRule}
                  onChange={e => setRoundingRule(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="round_half_up" style={{ background: '#0f172a' }}>Round Half Up</option>
                  <option value="round_down" style={{ background: '#0f172a' }}>Round Down</option>
                  <option value="round_up" style={{ background: '#0f172a' }}>Round Up</option>
                  <option value="truncate" style={{ background: '#0f172a' }}>Truncate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Alternative Methods */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#c4b5fd', fontWeight: 600 }}>
                  3. Accepted Alternative Solution Methods
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(245,245,255,0.38)' }}>
                  Accept substitution vs elimination, graphic vs algebraic solution paths.
                </p>
              </div>
              <SmOutlineButton onClick={addAltMethod} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                + Add Method
              </SmOutlineButton>
            </div>

            {altMethods.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', fontStyle: 'italic' }}>
                No alternative methods added. Standard solution steps apply.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {altMethods.map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 24px', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Method Description (e.g. Graphing Method)"
                      value={m.description}
                      onChange={e => updateAltMethod(i, 'description', e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      placeholder="Expected Result for this method"
                      value={m.expected_result}
                      onChange={e => updateAltMethod(i, 'expected_result', e.target.value)}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => removeAltMethod(i)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Error-Specific Instructions */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#c4b5fd', fontWeight: 600 }}>
                  4. Error-Specific Marking Instructions
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(245,245,255,0.38)' }}>
                  Define penalties or actions for specific student errors (arithmetic, sign, formula).
                </p>
              </div>
              <SmOutlineButton onClick={addErrorInstruction} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                + Add Instruction
              </SmOutlineButton>
            </div>

            {errorInstructions.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'rgba(245,245,255,0.3)', fontStyle: 'italic' }}>
                No error-specific policies configured.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {errorInstructions.map((err, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 140px 70px 24px', gap: 8, alignItems: 'center' }}>
                    <select
                      value={err.error_type}
                      onChange={e => updateErrorInstruction(i, 'error_type', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {ERROR_TYPES.map(t => (
                        <option key={t.value} value={t.value} style={{ background: '#0f172a' }}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Instruction (e.g. deduct 0.5 for simple sign flip)"
                      value={err.instruction}
                      onChange={e => updateErrorInstruction(i, 'instruction', e.target.value)}
                      style={inputStyle}
                    />
                    <select
                      value={err.marking_policy}
                      onChange={e => updateErrorInstruction(i, 'marking_policy', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {POLICIES.map(p => (
                        <option key={p.value} value={p.value} style={{ background: '#0f172a' }}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Deduct"
                      value={err.max_marks_deducted}
                      onChange={e => updateErrorInstruction(i, 'max_marks_deducted', e.target.value)}
                      style={inputStyle}
                      title="Max deduction"
                    />
                    <button
                      type="button"
                      onClick={() => removeErrorInstruction(i)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teacher review toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
            <input
              type="checkbox"
              id="requireReview"
              checked={requiresReview}
              onChange={e => setRequiresReview(e.target.checked)}
              style={{ accentColor: '#7c3aed' }}
            />
            <label htmlFor="requireReview" style={{ fontSize: '0.82rem', color: '#f8fafc', cursor: 'pointer' }}>
              Always require teacher manual verification for this question before results approval
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={handleApply}>Apply Configuration</PrimaryButton>
        </div>
      </div>
    </div>
  );
}


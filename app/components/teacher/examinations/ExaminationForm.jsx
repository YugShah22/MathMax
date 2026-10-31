'use client';
import { useState } from 'react';
import FileDropZone from '@/app/components/ui/FileDropZone';
import { PrimaryButton, GhostButton } from '@/app/components/ui/Button';
import {
  createExamination,
  updateExamination,
  uploadQuestionPaperDocument,
  uploadAnswerKeyDocument,
} from '@/app/lib/api';

const EXAM_TYPES = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'mid_term', label: 'Mid Term' },
  { value: 'final', label: 'Final Exam' },
  { value: 'practice', label: 'Practice Paper' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'other', label: 'Other' },
];

export default function ExaminationForm({
  exam = null,
  onSaved,
  onCancel,
  showToast,
}) {
  const isEdit = Boolean(exam?.id);

  const [title, setTitle] = useState(exam?.title || '');
  const [subject, setSubject] = useState(exam?.subject || '');
  const [academicYear, setAcademicYear] = useState(exam?.academic_year || '2025-2026');
  const [examType, setExamType] = useState(exam?.examination_type || 'unit_test');
  const [totalMarks, setTotalMarks] = useState(exam?.total_marks || 20);
  const [durationMinutes, setDurationMinutes] = useState(exam?.duration_minutes || 60);
  const [description, setDescription] = useState(exam?.description || '');
  const [scheduledAt, setScheduledAt] = useState(exam?.scheduled_at ? exam.scheduled_at.slice(0, 16) : '');

  // File states for upload
  const [qpFile, setQpFile] = useState(null);
  const [ansFile, setAnsFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (Number(totalMarks) <= 0) {
      setError('Total marks must be greater than 0.');
      return;
    }
    if (Number(durationMinutes) <= 0) {
      setError('Duration must be greater than 0.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        academic_year: academicYear.trim(),
        examination_type: examType,
        total_marks: Number(totalMarks),
        duration_minutes: Number(durationMinutes),
        description: description.trim(),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };

      let resultExam;
      if (isEdit) {
        resultExam = await updateExamination(exam.id, payload);
        showToast?.('Examination updated successfully.');
      } else {
        resultExam = await createExamination(payload);
        showToast?.('Examination created successfully.');
      }

      // Handle file uploads if selected
      if (qpFile && resultExam?.id) {
        try {
          await uploadQuestionPaperDocument(resultExam.id, qpFile);
          showToast?.('Question paper uploaded.');
        } catch (uploadErr) {
          console.error('QP upload failed:', uploadErr);
          showToast?.(`Exam saved, but QP upload failed: ${uploadErr.message}`);
        }
      }

      if (ansFile && resultExam?.id) {
        try {
          await uploadAnswerKeyDocument(resultExam.id, ansFile);
          showToast?.('Answer key file uploaded.');
        } catch (uploadErr) {
          console.error('Answer key upload failed:', uploadErr);
          showToast?.(`Exam saved, but answer key upload failed: ${uploadErr.message}`);
        }
      }

      onSaved?.(resultExam);
    } catch (err) {
      console.error('Failed to save examination:', err);
      setError(err.message || 'Failed to save examination.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#f8fafc', fontSize: '0.88rem', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    color: 'rgba(245,245,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Form Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            {isEdit ? `Edit: ${exam.title}` : 'Create New Examination'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'rgba(245,245,255,0.45)' }}>
            Configure basic examination metadata, marks, duration, and optional paper documents
          </p>
        </div>
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5', fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: 20,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: 28,
      }}>
        {/* Section 1: Basic Details */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#c4b5fd', margin: '0 0 14px' }}>
            1. Basic Examination Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>Examination Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Calculus Mid-Term Examination"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="2025-2026"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Examination Type</label>
              <select
                value={examType}
                onChange={e => setExamType(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {EXAM_TYPES.map(t => (
                  <option key={t.value} value={t.value} style={{ background: '#0f172a' }}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Timing & Marks */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#c4b5fd', margin: '0 0 14px' }}>
            2. Duration, Marks & Schedule
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>Total Marks *</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={totalMarks}
                onChange={e => setTotalMarks(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Duration (Minutes) *</label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Scheduled Date & Time (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Description / Instructions</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add exam guidelines, calculator policy, formula sheet availability, etc."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Section 3: Document Uploads */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#c4b5fd', margin: '0 0 8px' }}>
            3. Question Paper & Answer Key Documents
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'rgba(245,245,255,0.38)' }}>
            Upload reference question papers or solution files for this examination (PDF, PNG, JPG).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>Question Paper File (PDF/Image)</label>
              <FileDropZone file={qpFile} onFile={setQpFile} accept=".pdf,.png,.jpg,.jpeg" />
            </div>
            <div>
              <label style={labelStyle}>Answer Key Reference File (PDF/Image)</label>
              <FileDropZone file={ansFile} onFile={setAnsFile} accept=".pdf,.png,.jpg,.jpeg" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <GhostButton onClick={onCancel} type="button">Cancel</GhostButton>
          <PrimaryButton disabled={saving} type="submit">
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Examination')}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}


import mongoose from 'mongoose';

const ReevaluationSchema = new mongoose.Schema({
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
  paperId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Paper',      required: true },
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true, index: true },
  question:     { type: String, required: true },           // e.g. "Q4"
  reason:       { type: String, required: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  teacherNote:  { type: String, default: null },
  resolvedAt:   { type: Date,   default: null },
}, { timestamps: true });

export default mongoose.models.Reevaluation || mongoose.model('Reevaluation', ReevaluationSchema);

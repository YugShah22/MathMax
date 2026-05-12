import mongoose from 'mongoose';

const QuestionMarkSchema = new mongoose.Schema({
  got:  { type: Number, required: true },
  full: { type: Number, required: true },
}, { _id: false });

const SubmissionSchema = new mongoose.Schema({
  paperId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true, index: true },
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true, index: true },
  filePath:    { type: String, required: true },
  status:      { type: String, enum: ['submitted', 'grading', 'graded'], default: 'submitted' },
  score:       { type: Number, default: null },
  feedback:    { type: String, default: null },
  qBreakdown:  { type: [QuestionMarkSchema], default: [] },
  gradedAt:    { type: Date,   default: null },
}, { timestamps: true });

// A student can only submit once per paper
SubmissionSchema.index({ paperId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);

import mongoose from 'mongoose';

const PaperSchema = new mongoose.Schema({
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  teacherId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  title:        { type: String, required: true, trim: true },
  code:         { type: String, required: true, unique: true, uppercase: true, trim: true },
  deadline:     { type: Date,   default: null },
  qpPath:       { type: String, default: null },
  solutionPath: { type: String, default: null },
}, { timestamps: true });

PaperSchema.index({ code: 1 });

export default mongoose.models.Paper || mongoose.model('Paper', PaperSchema);

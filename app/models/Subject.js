import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  color:     { type: String, default: '#7c3aed' },
  joinCode:  { type: String, unique: true, sparse: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

SubjectSchema.index({ joinCode: 1 });

export default mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);

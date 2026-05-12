import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

// One request per student per subject
EnrollmentSchema.index({ subjectId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);

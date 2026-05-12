import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['teacher', 'student'], required: true },
}, { timestamps: true });

UserSchema.index({ email: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);

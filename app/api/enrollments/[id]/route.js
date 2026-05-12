import dbConnect from '@/app/lib/db';
import Enrollment from '@/app/models/Enrollment';
import Subject from '@/app/models/Subject';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** PATCH /api/enrollments/[id] — teacher approves or rejects */
export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();
    const { id } = await params;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) return errorJson('Enrollment not found', 404);

    // Verify teacher owns the subject
    const subject = await Subject.findOne({ _id: enrollment.subjectId, teacherId: user.id });
    if (!subject) return errorJson('Forbidden', 403);

    const { status } = await req.json();
    if (!['approved', 'rejected'].includes(status)) {
      return errorJson('status must be "approved" or "rejected"');
    }

    enrollment.status = status;
    enrollment.resolvedAt = new Date();
    await enrollment.save();

    return json({ enrollment: { id: enrollment._id, status } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('PATCH /api/enrollments/[id] error:', err);
    return errorJson('Server error', 500);
  }
}

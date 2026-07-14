import dbConnect from '@/app/lib/db';
import Subject from '@/app/models/Subject';
import Enrollment from '@/app/models/Enrollment';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/**
 * GET  /api/enrollments
 *   - teacher: list all enrollment requests for their subjects
 *   - student: list their own enrollments
 *
 * POST /api/enrollments  { joinCode }
 *   - student: request to join a subject by code
 */

export async function GET(req) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');

    if (user.role === 'teacher') {
      // Get all subjects owned by teacher
      const teacherSubjectIds = (
        await Subject.find({ teacherId: user.id }).select('_id').lean()
      ).map(s => s._id);

      const query = subjectId
        ? { subjectId, subjectId: { $in: teacherSubjectIds } }
        : { subjectId: { $in: teacherSubjectIds } };

      const enrollments = await Enrollment.find(query)
        .populate('studentId', 'name email')
        .populate('subjectId', 'name color joinCode')
        .sort({ createdAt: -1 })
        .lean();

      const result = enrollments.map(e => ({
        id: e._id,
        studentName: e.studentId?.name || 'Unknown',
        studentEmail: e.studentId?.email || '',
        subject: e.subjectId?.name || '',
        subjectColor: e.subjectId?.color || '#7c3aed',
        subjectId: e.subjectId?._id,
        status: e.status,
        requestedAt: e.createdAt,
      }));

      return json({ enrollments: result });
    }

    // Student — list their enrollments
    const enrollments = await Enrollment.find({ studentId: user.id })
      .populate('subjectId', 'name color joinCode teacherId')
      .sort({ createdAt: -1 })
      .lean();

    // Also get teacher names
    const { default: User } = await import('@/app/models/User');
    const teacherIds = [...new Set(enrollments.map(e => e.subjectId?.teacherId?.toString()).filter(Boolean))];
    const teachers = await User.find({ _id: { $in: teacherIds } }).select('name').lean();
    const tMap = Object.fromEntries(teachers.map(t => [t._id.toString(), t.name]));

    const result = enrollments.map(e => ({
      id: e._id,
      subjectId: e.subjectId?._id,
      subject: e.subjectId?.name || '',
      subjectColor: e.subjectId?.color || '#7c3aed',
      joinCode: e.subjectId?.joinCode || '',
      teacherName: tMap[e.subjectId?.teacherId?.toString()] || 'Unknown',
      status: e.status,
      requestedAt: e.createdAt,
    }));

    return json({ enrollments: result });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/enrollments error:', err);
    return errorJson('Server error', 500);
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(); // any authenticated user can join
    await dbConnect();

    const { joinCode } = await req.json();
    if (!joinCode?.trim()) return errorJson('Join code is required');

    const subject = await Subject.findOne({ joinCode: joinCode.trim().toUpperCase() });
    if (!subject) return errorJson('Invalid join code — no subject found', 404);

    // Prevent the teacher of the subject from joining their own subject
    if (String(subject.teacherId) === String(user.id)) {
      return errorJson('You cannot join your own subject', 400);
    }

    // Check if already enrolled or requested
    const existing = await Enrollment.findOne({ subjectId: subject._id, studentId: user.id });
    if (existing) {
      if (existing.status === 'approved') return errorJson('You are already enrolled in this subject', 409);
      if (existing.status === 'pending')  return errorJson('Your request is already pending approval', 409);
      if (existing.status === 'rejected') {
        // Allow re-request after rejection
        existing.status = 'pending';
        existing.resolvedAt = null;
        await existing.save();
        return json({
          enrollment: { id: existing._id, subject: subject.name, status: 'pending' },
          message: 'Request re-submitted',
        });
      }
    }

    const enrollment = await Enrollment.create({
      subjectId: subject._id,
      studentId: user.id,
    });

    // Get teacher name
    const { default: User } = await import('@/app/models/User');
    const teacher = await User.findById(subject.teacherId).select('name').lean();

    return json({
      enrollment: {
        id: enrollment._id,
        subjectId: subject._id,
        subject: subject.name,
        subjectColor: subject.color,
        teacherName: teacher?.name || 'Unknown',
        status: 'pending',
      },
      message: `Request sent to ${teacher?.name || 'teacher'} for "${subject.name}"`,
    }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('POST /api/enrollments error:', err);
    return errorJson('Server error', 500);
  }
}

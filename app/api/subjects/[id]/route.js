import dbConnect from '@/app/lib/db';
import Subject from '@/app/models/Subject';
import Paper from '@/app/models/Paper';
import Submission from '@/app/models/Submission';
import Enrollment from '@/app/models/Enrollment';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** PATCH /api/subjects/[id] — edit subject name / color */
export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();
    const { id } = await params;

    const subject = await Subject.findOne({ _id: id, teacherId: user.id });
    if (!subject) return errorJson('Subject not found', 404);

    const { name, color } = await req.json();
    if (name !== undefined) subject.name  = name.trim() || subject.name;
    if (color !== undefined) subject.color = color;
    await subject.save();

    return json({ subject: { id: subject._id, name: subject.name, color: subject.color, joinCode: subject.joinCode } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('PATCH /api/subjects/[id] error:', err);
    return errorJson('Server error', 500);
  }
}

/** DELETE /api/subjects/[id] — delete subject + all its papers + submissions + enrollments */
export async function DELETE(req, { params }) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();
    const { id } = await params;

    const subject = await Subject.findOne({ _id: id, teacherId: user.id });
    if (!subject) return errorJson('Subject not found', 404);

    // Cascade: delete all submissions for papers in this subject
    const paperIds = (await Paper.find({ subjectId: id }).select('_id').lean()).map(p => p._id);
    if (paperIds.length > 0) {
      await Submission.deleteMany({ paperId: { $in: paperIds } });
    }
    await Paper.deleteMany({ subjectId: id });
    await Enrollment.deleteMany({ subjectId: id });
    await Subject.deleteOne({ _id: id });

    return json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('DELETE /api/subjects/[id] error:', err);
    return errorJson('Server error', 500);
  }
}


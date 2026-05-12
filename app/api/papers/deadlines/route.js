import dbConnect from '@/app/lib/db';
import Paper from '@/app/models/Paper';
import Subject from '@/app/models/Subject';
import Submission from '@/app/models/Submission';
import Enrollment from '@/app/models/Enrollment';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** GET /api/papers/deadlines — student: papers only from ENROLLED subjects */
export async function GET() {
  try {
    const user = await requireAuth('student');
    await dbConnect();

    // Get subject IDs where student is approved
    const enrolledSubjectIds = (
      await Enrollment.find({ studentId: user.id, status: 'approved' }).select('subjectId').lean()
    ).map(e => e.subjectId);

    if (enrolledSubjectIds.length === 0) {
      return json({ papers: [] });
    }

    // Get papers only from enrolled subjects
    const papers = await Paper.find({ subjectId: { $in: enrolledSubjectIds } }).sort({ deadline: 1 }).lean();

    const result = await Promise.all(
      papers.map(async (p) => {
        const subject = await Subject.findById(p.subjectId).select('name color').lean();
        const submitted = await Submission.findOne({ paperId: p._id, studentId: user.id }).lean();

        return {
          id: p._id,
          title: p.title,
          code: p.code,
          deadline: p.deadline ? p.deadline.toISOString() : null,
          subject: subject?.name || 'Unknown',
          subjectColor: subject?.color || '#7c3aed',
          submitted: !!submitted,
          submissionStatus: submitted?.status || null,
          score: submitted?.score ?? null,
        };
      })
    );

    return json({ papers: result });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/papers/deadlines error:', err);
    return errorJson('Server error', 500);
  }
}

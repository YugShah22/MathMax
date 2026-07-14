import dbConnect from '@/app/lib/db';
import Submission from '@/app/models/Submission';
import Paper from '@/app/models/Paper';
import Subject from '@/app/models/Subject';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** GET /api/results — student: all their graded results */
export async function GET() {
  try {
    const user = await requireAuth(); // any authenticated user
    await dbConnect();

    const submissions = await Submission.find({ studentId: user.id, status: 'graded' })
      .populate('paperId', 'title code subjectId deadline')
      .sort({ gradedAt: -1 })
      .lean();

    // Resolve subject names
    const subjectIds = [...new Set(submissions.map(s => s.paperId?.subjectId?.toString()).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const subMap = Object.fromEntries(subjects.map(s => [s._id.toString(), s]));

    const results = submissions.map(s => {
      const sub = subMap[s.paperId?.subjectId?.toString()] || {};
      return {
        id: s._id,
        paper: s.paperId?.title || '',
        code: s.paperId?.code || '',
        subject: sub.name || 'Unknown',
        subjectColor: sub.color || '#7c3aed',
        score: s.score,
        feedback: s.feedback,
        qBreakdown: s.qBreakdown,
        date: s.gradedAt ? s.gradedAt.toISOString().slice(0, 10) : '',
        submittedAt: s.createdAt,
      };
    });

    return json({ results });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/results error:', err);
    return errorJson('Server error', 500);
  }
}

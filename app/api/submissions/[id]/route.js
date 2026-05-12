import dbConnect from '@/app/lib/db';
import Submission from '@/app/models/Submission';
import Paper from '@/app/models/Paper';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** GET /api/submissions/[id] — get single submission detail */
export async function GET(req, { params }) {
  try {
    const user = await requireAuth();
    await dbConnect();
    const { id } = await params;

    const sub = await Submission.findById(id)
      .populate('studentId', 'name email')
      .populate('paperId', 'title code')
      .lean();

    if (!sub) return errorJson('Submission not found', 404);

    // Auth check: student can only see own, teacher can see any they own
    if (user.role === 'student' && sub.studentId._id.toString() !== user.id) {
      return errorJson('Forbidden', 403);
    }
    if (user.role === 'teacher') {
      const paper = await Paper.findById(sub.paperId._id);
      if (paper.teacherId.toString() !== user.id) {
        return errorJson('Forbidden', 403);
      }
    }

    return json({
      submission: {
        id: sub._id,
        studentName: sub.studentId?.name || 'Unknown',
        studentEmail: sub.studentId?.email || '',
        paper: sub.paperId?.title || '',
        paperCode: sub.paperId?.code || '',
        filePath: sub.filePath,
        status: sub.status,
        score: sub.score,
        feedback: sub.feedback,
        qBreakdown: sub.qBreakdown,
        submittedAt: sub.createdAt,
        gradedAt: sub.gradedAt,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/submissions/[id] error:', err);
    return errorJson('Server error', 500);
  }
}

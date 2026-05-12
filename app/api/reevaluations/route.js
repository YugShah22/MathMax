import dbConnect from '@/app/lib/db';
import Reevaluation from '@/app/models/Reevaluation';
import Submission from '@/app/models/Submission';
import Paper from '@/app/models/Paper';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/**
 * GET  /api/reevaluations — teacher: list all re-eval requests for their papers
 * POST /api/reevaluations — student: submit a re-eval request
 */

export async function GET(req) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();

    // Get all paper IDs that belong to this teacher
    const teacherPaperIds = (
      await Paper.find({ teacherId: user.id }).select('_id').lean()
    ).map(p => p._id);

    const reevals = await Reevaluation.find({ paperId: { $in: teacherPaperIds } })
      .populate('studentId', 'name email')
      .populate('paperId', 'title code subjectId')
      .sort({ createdAt: -1 })
      .lean();

    // Resolve subjects
    const subjectIds = [...new Set(reevals.map(r => r.paperId?.subjectId?.toString()).filter(Boolean))];
    let subMap = {};
    if (subjectIds.length > 0) {
      const { default: Subject } = await import('@/app/models/Subject');
      const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
      subMap = Object.fromEntries(subjects.map(s => [s._id.toString(), s.name]));
    }

    const result = reevals.map(r => ({
      id: r._id,
      student: r.studentId?.name || 'Unknown',
      studentEmail: r.studentId?.email || '',
      paper: r.paperId?.title || '',
      paperCode: r.paperId?.code || '',
      subject: subMap[r.paperId?.subjectId?.toString()] || 'Unknown',
      question: r.question,
      reason: r.reason,
      status: r.status,
      teacherNote: r.teacherNote,
      date: r.createdAt ? r.createdAt.toISOString().slice(0, 10) : '',
    }));

    return json({ reevaluations: result });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/reevaluations error:', err);
    return errorJson('Server error', 500);
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth('student');
    await dbConnect();

    const { submissionId, question, reason } = await req.json();
    if (!submissionId || !question || !reason?.trim()) {
      return errorJson('submissionId, question, and reason are required');
    }

    // Verify submission belongs to student
    const sub = await Submission.findOne({ _id: submissionId, studentId: user.id });
    if (!sub) return errorJson('Submission not found', 404);

    // Check if already requested for this question
    const existing = await Reevaluation.findOne({ submissionId, question, studentId: user.id });
    if (existing) return errorJson('Re-evaluation already requested for this question', 409);

    const reeval = await Reevaluation.create({
      submissionId,
      paperId: sub.paperId,
      studentId: user.id,
      question,
      reason: reason.trim(),
    });

    return json({
      reevaluation: {
        id: reeval._id,
        question: reeval.question,
        reason: reeval.reason,
        status: reeval.status,
      },
    }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('POST /api/reevaluations error:', err);
    return errorJson('Server error', 500);
  }
}

import dbConnect from '@/app/lib/db';
import Submission from '@/app/models/Submission';
import Paper from '@/app/models/Paper';
import { requireAuth, json, errorJson } from '@/app/lib/auth';
import { gradeSubmission } from '@/app/lib/grader';

/**
 * GET  /api/submissions?paperId=X — teacher: list all submissions for a paper
 * POST /api/submissions            — student: upload answer sheet
 */

export async function GET(req) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const paperId = searchParams.get('paperId');
    if (!paperId) return errorJson('paperId is required');

    // Verify paper belongs to teacher
    const paper = await Paper.findOne({ _id: paperId, teacherId: user.id });
    if (!paper) return errorJson('Paper not found', 404);

    const submissions = await Submission.find({ paperId })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const result = submissions.map(s => ({
      id: s._id,
      studentName: s.studentId?.name || 'Unknown',
      studentEmail: s.studentId?.email || '',
      filePath: s.filePath,
      status: s.status,
      score: s.score,
      feedback: s.feedback,
      qBreakdown: s.qBreakdown,
      submittedAt: s.createdAt,
      gradedAt: s.gradedAt,
    }));

    return json({ submissions: result });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/submissions error:', err);
    return errorJson('Server error', 500);
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth('student');
    await dbConnect();

    const { paperId, filePath } = await req.json();
    if (!paperId || !filePath) {
      return errorJson('paperId and filePath are required');
    }

    const paper = await Paper.findById(paperId);
    if (!paper) return errorJson('Paper not found', 404);

    // Check deadline
    if (paper.deadline && new Date(paper.deadline) < new Date()) {
      return errorJson('Submission deadline has passed', 400);
    }

    // Check if already submitted
    const existing = await Submission.findOne({ paperId, studentId: user.id });
    if (existing) {
      return errorJson('You have already submitted for this paper', 409);
    }

    // Create submission
    const submission = await Submission.create({
      paperId,
      studentId: user.id,
      filePath,
      status: 'grading',
    });

    // Run mock AI grading immediately
    const gradeResult = gradeSubmission({ filePath, paperTitle: paper.title });

    submission.score      = gradeResult.score;
    submission.feedback   = gradeResult.feedback;
    submission.qBreakdown = gradeResult.qBreakdown;
    submission.status     = 'graded';
    submission.gradedAt   = new Date();
    await submission.save();

    return json({
      submission: {
        id: submission._id,
        score: submission.score,
        feedback: submission.feedback,
        qBreakdown: submission.qBreakdown,
        status: submission.status,
      },
    }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('POST /api/submissions error:', err);
    return errorJson('Server error', 500);
  }
}

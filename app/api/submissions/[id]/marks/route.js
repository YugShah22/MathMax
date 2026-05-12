import dbConnect from '@/app/lib/db';
import Submission from '@/app/models/Submission';
import Paper from '@/app/models/Paper';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** PATCH /api/submissions/[id]/marks — teacher overrides AI marks */
export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();
    const { id } = await params;

    const sub = await Submission.findById(id);
    if (!sub) return errorJson('Submission not found', 404);

    const paper = await Paper.findById(sub.paperId);
    if (!paper || paper.teacherId.toString() !== user.id) {
      return errorJson('Forbidden', 403);
    }

    const { qBreakdown } = await req.json();
    if (!Array.isArray(qBreakdown) || qBreakdown.length === 0) {
      return errorJson('qBreakdown array is required');
    }

    // Validate each entry
    for (const q of qBreakdown) {
      if (typeof q.got !== 'number' || typeof q.full !== 'number') {
        return errorJson('Each question must have got and full as numbers');
      }
      if (q.got < 0 || q.got > q.full) {
        return errorJson('got must be between 0 and full');
      }
    }

    // Update
    const totalGot  = qBreakdown.reduce((a, q) => a + q.got, 0);
    const totalFull = qBreakdown.reduce((a, q) => a + q.full, 0);
    const newScore  = Math.round((totalGot / totalFull) * 100);

    sub.qBreakdown = qBreakdown;
    sub.score      = newScore;
    sub.gradedAt   = new Date();
    await sub.save();

    return json({ submission: { id: sub._id, score: newScore, qBreakdown } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('PATCH /api/submissions/[id]/marks error:', err);
    return errorJson('Server error', 500);
  }
}

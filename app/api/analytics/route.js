import dbConnect from '@/app/lib/db';
import Submission from '@/app/models/Submission';
import Paper from '@/app/models/Paper';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** GET /api/analytics?paperId=X — teacher: analytics for a paper */
export async function GET(req) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const paperId = searchParams.get('paperId');
    if (!paperId) return errorJson('paperId is required');

    const paper = await Paper.findOne({ _id: paperId, teacherId: user.id });
    if (!paper) return errorJson('Paper not found', 404);

    const subs = await Submission.find({ paperId, status: 'graded' })
      .select('score')
      .lean();

    if (subs.length === 0) {
      return json({
        totalSubmissions: 0,
        avg: 0,
        passRate: 0,
        highest: 0,
        lowest: 0,
        scores: [],
      });
    }

    const scores       = subs.map(s => s.score);
    const avg          = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const passRate     = Math.round((scores.filter(s => s >= 40).length / scores.length) * 100);
    const highest      = Math.max(...scores);
    const lowest       = Math.min(...scores);

    return json({
      totalSubmissions: scores.length,
      avg,
      passRate,
      highest,
      lowest,
      scores,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/analytics error:', err);
    return errorJson('Server error', 500);
  }
}

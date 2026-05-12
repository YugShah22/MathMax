import dbConnect from '@/app/lib/db';
import Submission from '@/app/models/Submission';
import Paper from '@/app/models/Paper';
import Subject from '@/app/models/Subject';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** GET /api/results/stats — student home: aggregate stats + score trend */
export async function GET() {
  try {
    const user = await requireAuth('student');
    await dbConnect();

    const subs = await Submission.find({ studentId: user.id, status: 'graded' })
      .populate('paperId', 'subjectId')
      .sort({ gradedAt: 1 })
      .lean();

    if (subs.length === 0) {
      return json({
        totalSubmissions: 0,
        avgScore: 0,
        bestScore: 0,
        improvement: 0,
        scoreTrend: [],
        bySubject: [],
      });
    }

    const scores = subs.map(s => s.score);
    const totalSubmissions = scores.length;
    const avgScore         = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore        = Math.max(...scores);
    const improvement      = scores[scores.length - 1] - scores[0];

    // Score trend
    const scoreTrend = subs.map(s => ({
      label: s.gradedAt
        ? new Date(s.gradedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '',
      score: s.score,
    }));

    // By subject
    const subjectIds = [...new Set(subs.map(s => s.paperId?.subjectId?.toString()).filter(Boolean))];
    const subjects   = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const subMap     = Object.fromEntries(subjects.map(s => [s._id.toString(), s]));

    const subjectScores = {};
    subs.forEach(s => {
      const sid = s.paperId?.subjectId?.toString();
      if (!sid) return;
      if (!subjectScores[sid]) subjectScores[sid] = [];
      subjectScores[sid].push(s.score);
    });

    const bySubject = Object.entries(subjectScores).map(([sid, arr]) => ({
      name:  subMap[sid]?.name  || 'Unknown',
      color: subMap[sid]?.color || '#7c3aed',
      avg:   Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    }));

    return json({ totalSubmissions, avgScore, bestScore, improvement, scoreTrend, bySubject });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/results/stats error:', err);
    return errorJson('Server error', 500);
  }
}

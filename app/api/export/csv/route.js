import dbConnect from '@/app/lib/db';
import Submission from '@/app/models/Submission';
import Paper from '@/app/models/Paper';
import Subject from '@/app/models/Subject';
import { requireAuth, errorJson } from '@/app/lib/auth';

/** GET /api/export/csv?paperId=X — teacher downloads CSV of all graded submissions */
export async function GET(req) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const paperId = searchParams.get('paperId');
    if (!paperId) return errorJson('paperId is required');

    const paper = await Paper.findOne({ _id: paperId, teacherId: user.id });
    if (!paper) return errorJson('Paper not found', 404);

    const subject = await Subject.findById(paper.subjectId).lean();
    const subName = subject?.name || 'Unknown';

    const subs = await Submission.find({ paperId, status: 'graded' })
      .populate('studentId', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    // Build CSV
    const rows = [['Student', 'Email', 'Score', 'Grade', 'Paper', 'Subject', 'Submitted At']];
    for (const s of subs) {
      const grade = s.score >= 85 ? 'A' : s.score >= 65 ? 'B' : s.score >= 40 ? 'C' : 'F';
      rows.push([
        s.studentId?.name || 'Unknown',
        s.studentId?.email || '',
        s.score,
        grade,
        paper.title,
        subName,
        s.createdAt ? new Date(s.createdAt).toISOString() : '',
      ]);
    }

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${paper.code}_results.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/export/csv error:', err);
    return errorJson('Server error', 500);
  }
}

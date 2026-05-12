import dbConnect from '@/app/lib/db';
import Paper from '@/app/models/Paper';
import Subject from '@/app/models/Subject';
import { getUser, json, errorJson } from '@/app/lib/auth';

/** GET /api/papers/lookup?code=X — student looks up a paper by QP code */
export async function GET(req) {
  try {
    const user = await getUser();
    if (!user) return errorJson('Not authenticated', 401);

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.toUpperCase().trim();
    if (!code) return errorJson('code query param is required');

    const paper = await Paper.findOne({ code }).lean();
    if (!paper) return errorJson('Paper not found', 404);

    const subject = await Subject.findById(paper.subjectId).lean();

    return json({
      paper: {
        id: paper._id,
        title: paper.title,
        code: paper.code,
        deadline: paper.deadline ? paper.deadline.toISOString() : null,
        subject: subject?.name || 'Unknown',
        subjectColor: subject?.color || '#7c3aed',
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/papers/lookup error:', err);
    return errorJson('Server error', 500);
  }
}

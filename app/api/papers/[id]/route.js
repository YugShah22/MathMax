import dbConnect from '@/app/lib/db';
import Paper from '@/app/models/Paper';
import Submission from '@/app/models/Submission';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** PATCH /api/papers/[id] — edit paper title, deadline, qpPath, solutionPath */
export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();
    const { id } = await params;

    const paper = await Paper.findOne({ _id: id, teacherId: user.id });
    if (!paper) return errorJson('Paper not found', 404);

    const { title, deadline } = await req.json();
    if (title    !== undefined) paper.title    = title.trim() || paper.title;
    if (deadline !== undefined) paper.deadline = deadline ? new Date(deadline) : null;
    await paper.save();

    return json({
      paper: {
        id: paper._id,
        title: paper.title,
        code: paper.code,
        deadline: paper.deadline ? paper.deadline.toISOString() : null,
        date: paper.createdAt.toISOString().slice(0, 10),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('PATCH /api/papers/[id] error:', err);
    return errorJson('Server error', 500);
  }
}

/** DELETE /api/papers/[id] — delete paper + all its submissions */
export async function DELETE(req, { params }) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();
    const { id } = await params;

    const paper = await Paper.findOne({ _id: id, teacherId: user.id });
    if (!paper) return errorJson('Paper not found', 404);

    await Submission.deleteMany({ paperId: id });
    await Paper.deleteOne({ _id: id });

    return json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('DELETE /api/papers/[id] error:', err);
    return errorJson('Server error', 500);
  }
}

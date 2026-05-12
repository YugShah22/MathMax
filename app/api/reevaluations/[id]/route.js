import dbConnect from '@/app/lib/db';
import Reevaluation from '@/app/models/Reevaluation';
import Paper from '@/app/models/Paper';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/** PATCH /api/reevaluations/[id] — teacher approves/rejects */
export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();
    const { id } = await params;

    const reeval = await Reevaluation.findById(id);
    if (!reeval) return errorJson('Re-evaluation not found', 404);

    // Verify teacher owns the paper
    const paper = await Paper.findOne({ _id: reeval.paperId, teacherId: user.id });
    if (!paper) return errorJson('Forbidden', 403);

    const { status, teacherNote } = await req.json();
    if (!['approved', 'rejected'].includes(status)) {
      return errorJson('status must be "approved" or "rejected"');
    }

    reeval.status      = status;
    reeval.teacherNote = teacherNote || null;
    reeval.resolvedAt  = new Date();
    await reeval.save();

    return json({
      reevaluation: {
        id: reeval._id,
        status: reeval.status,
        teacherNote: reeval.teacherNote,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('PATCH /api/reevaluations/[id] error:', err);
    return errorJson('Server error', 500);
  }
}

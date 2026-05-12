import dbConnect from '@/app/lib/db';
import Paper from '@/app/models/Paper';
import Subject from '@/app/models/Subject';
import Submission from '@/app/models/Submission';
import { requireAuth, getUser, json, errorJson } from '@/app/lib/auth';
import { generateCode } from '@/app/lib/codeGen';

/** GET /api/papers?subjectId=X — list papers for a subject (teacher) */
export async function GET(req) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    if (!subjectId) return errorJson('subjectId is required');

    // Verify subject belongs to this teacher
    const subject = await Subject.findOne({ _id: subjectId, teacherId: user.id });
    if (!subject) return errorJson('Subject not found', 404);

    const papers = await Paper.find({ subjectId }).sort({ createdAt: -1 }).lean();

    // Attach submission counts
    const withCounts = await Promise.all(
      papers.map(async (p) => {
        const submissions = await Submission.countDocuments({ paperId: p._id });
        return {
          ...p,
          id: p._id,
          date: p.createdAt.toISOString().slice(0, 10),
          deadline: p.deadline ? p.deadline.toISOString() : null,
          submissions,
        };
      })
    );

    return json({ papers: withCounts });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/papers error:', err);
    return errorJson('Server error', 500);
  }
}

/** POST /api/papers — create a paper (teacher) */
export async function POST(req) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();

    const body = await req.json();
    const { subjectId, title, deadline } = body;

    if (!subjectId || !title?.trim()) {
      return errorJson('subjectId and title are required');
    }

    const subject = await Subject.findOne({ _id: subjectId, teacherId: user.id });
    if (!subject) return errorJson('Subject not found', 404);

    // Generate unique code
    const existingCount = await Paper.countDocuments({ subjectId });
    let code = generateCode(subject.name, title, existingCount + 1);

    // Ensure uniqueness
    let attempts = 0;
    while (await Paper.findOne({ code }) && attempts < 10) {
      attempts++;
      code = generateCode(subject.name, title, existingCount + 1 + attempts);
    }

    const paper = await Paper.create({
      subjectId,
      teacherId: user.id,
      title: title.trim(),
      code,
      deadline: deadline ? new Date(deadline) : null,
      qpPath: body.qpPath || null,
      solutionPath: body.solutionPath || null,
    });

    return json({
      paper: {
        ...paper.toObject(),
        id: paper._id,
        date: paper.createdAt.toISOString().slice(0, 10),
        deadline: paper.deadline ? paper.deadline.toISOString() : null,
        submissions: 0,
      },
    }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('POST /api/papers error:', err);
    return errorJson('Server error', 500);
  }
}

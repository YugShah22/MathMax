import dbConnect from '@/app/lib/db';
import Subject from '@/app/models/Subject';
import Paper from '@/app/models/Paper';
import Enrollment from '@/app/models/Enrollment';
import { requireAuth, json, errorJson } from '@/app/lib/auth';
import { generateJoinCode } from '@/app/lib/codeGen';

/** GET /api/subjects — list teacher's subjects with paper count + enrollment count */
export async function GET() {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();

    const subjects = await Subject.find({ teacherId: user.id }).sort({ createdAt: -1 }).lean();

    const withCounts = await Promise.all(
      subjects.map(async (s) => {
        // Auto-generate joinCode for subjects created before the field was added.
        // Use native driver to bypass Mongoose strict-mode schema cache in dev.
        let joinCode = s.joinCode;
        if (!joinCode) {
          let candidate = generateJoinCode(s.name);
          let attempts = 0;
          while (await Subject.findOne({ joinCode: candidate, _id: { $ne: s._id } }) && attempts < 20) {
            candidate = generateJoinCode(s.name);
            attempts++;
          }
          // Native driver update — ignores schema strictness
          await Subject.collection.updateOne(
            { _id: s._id },
            { $set: { joinCode: candidate } }
          );
          joinCode = candidate;
        }

        const papers   = await Paper.countDocuments({ subjectId: s._id });
        const enrolled = await Enrollment.countDocuments({ subjectId: s._id, status: 'approved' });
        const pending  = await Enrollment.countDocuments({ subjectId: s._id, status: 'pending' });
        return { ...s, id: s._id.toString(), joinCode, papers, enrolled, pendingRequests: pending };
      })
    );

    return json({ subjects: withCounts });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('GET /api/subjects error:', err);
    return errorJson('Server error', 500);
  }
}

/** POST /api/subjects — create a subject with auto-generated join code */
export async function POST(req) {
  try {
    const user = await requireAuth('teacher');
    await dbConnect();

    const { name, color } = await req.json();
    if (!name?.trim()) return errorJson('Subject name is required');

    // Generate unique join code
    let joinCode = generateJoinCode(name);
    let attempts = 0;
    while (await Subject.findOne({ joinCode }) && attempts < 20) {
      joinCode = generateJoinCode(name);
      attempts++;
    }

    const subject = await Subject.create({
      name: name.trim(),
      color: color || '#7c3aed',
      joinCode,
      teacherId: user.id,
    });

    return json({ subject: { ...subject.toObject(), id: subject._id.toString(), papers: 0, enrolled: 0, pendingRequests: 0 } }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('POST /api/subjects error:', err);
    return errorJson('Server error', 500);
  }
}

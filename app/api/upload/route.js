import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuth, json, errorJson } from '@/app/lib/auth';

/**
 * POST /api/upload — handles file uploads for QP, answer sheets, solutions.
 * Saves to /uploads/{type}/{timestamp}_{filename}
 * Returns { filePath } — the relative path stored in DB.
 */
export async function POST(req) {
  try {
    const user = await requireAuth();

    const formData = await req.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'general'; // 'qp' | 'answer' | 'solution'

    if (!file || typeof file === 'string') {
      return errorJson('No file uploaded');
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return errorJson('File too large (max 10MB)');
    }

    // Validate file type
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.name || '').toLowerCase();
    if (!allowed.includes(ext)) {
      return errorJson('Only PDF, JPG, and PNG files are allowed');
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', type);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp  = Date.now();
    const safeName   = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename   = `${timestamp}_${safeName}`;
    const filePath   = path.join(uploadDir, filename);
    const relativePath = `uploads/${type}/${filename}`;

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return json({ filePath: relativePath }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('POST /api/upload error:', err);
    return errorJson('Server error', 500);
  }
}

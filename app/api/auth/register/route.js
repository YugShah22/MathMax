import bcrypt from 'bcryptjs';
import dbConnect from '@/app/lib/db';
import User from '@/app/models/User';
import { signToken, json, errorJson } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return errorJson('All fields are required');
    }
    if (!['teacher', 'student'].includes(role)) {
      return errorJson('Role must be "teacher" or "student"');
    }
    if (password.length < 6) {
      return errorJson('Password must be at least 6 characters');
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return errorJson('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });

    const token = signToken(user);
    const cookieStore = await cookies();
    cookieStore.set('mm_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    }, 201);
  } catch (err) {
    console.error('Register error:', err);
    return errorJson('Server error', 500);
  }
}

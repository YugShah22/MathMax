import bcrypt from 'bcryptjs';
import dbConnect from '@/app/lib/db';
import User from '@/app/models/User';
import { signToken, json, errorJson } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return errorJson('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return errorJson('Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return errorJson('Invalid email or password', 401);
    }

    const token = signToken(user);
    const cookieStore = await cookies();
    cookieStore.set('mm_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return errorJson('Server error', 500);
  }
}

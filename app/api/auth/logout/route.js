import { json } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set('mm_token', '', { httpOnly: true, maxAge: 0, path: '/' });
  return json({ ok: true });
}

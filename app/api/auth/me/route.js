import { getUser, json, errorJson } from '@/app/lib/auth';

export async function GET() {
  const user = await getUser();
  if (!user) return errorJson('Not authenticated', 401);
  return json({ user });
}

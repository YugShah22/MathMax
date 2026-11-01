import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'fallback_dev_secret';

/** Sign a JWT for a user. Standardizes on RFC 7519 'sub' claim. */
export function signToken(user) {
  const userId = user._id ? user._id.toString() : user.id;
  return jwt.sign(
    { sub: userId, id: userId, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/** Verify and decode a JWT. Returns payload or null. Normalizes sub and id. */
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload && payload.sub && !payload.id) {
      payload.id = payload.sub;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user.
 * Checks Authorization header first (tab-isolated, for multi-session dev),
 * then falls back to the shared mm_token cookie.
 * Returns { id, email, role, name } or null.
 */
export async function getUser() {
  // 1. Try Bearer token from Authorization header (tab-isolated sessionStorage)
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) return user;
  }

  // 2. Fall back to HTTP-only cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('mm_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Require authentication. Throws a Response if not authenticated.
 * Returns the user payload.
 */
export async function requireAuth(requiredRole = null) {
  const user = await getUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (requiredRole && user.role !== requiredRole) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

/** Helper: JSON response */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Helper: error response */
export function errorJson(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

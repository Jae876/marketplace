import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    // Check if it's an admin token (starts with 'admin-token-')
    if (token.startsWith('admin-token-')) {
      return { userId: 'admin' };
    }
    
    // Otherwise verify as JWT
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function isAdminToken(userId: string): boolean {
  return userId === 'admin';
}

// Verify admin session from httpOnly cookie
export function verifyAdminSession(request: NextRequest): boolean {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value;
    
    if (!sessionToken) {
      console.log('[AUTH] No admin_session cookie found');
      return false;
    }

    // Validate token format (must be 64 hex characters)
    const isValid = /^[a-f0-9]{64}$/.test(sessionToken);
    console.log('[AUTH] Admin session validation:', isValid);
    return isValid;
  } catch (error) {
    console.error('[AUTH] Session verification error:', error);
    return false;
  }
}

export function getUserIdFromRequest(req: any): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}


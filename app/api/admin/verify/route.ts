import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Store active admin sessions (in production, use Redis or database)
const adminSessions = new Map<string, { createdAt: number; expiresAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    console.log('[ADMIN-VERIFY] Password received:', !!password);

    if (!password) {
      console.error('[ADMIN-VERIFY] No password provided');
      return NextResponse.json(
        { success: false, error: 'Password required' },
        { status: 400 }
      );
    }

    // Get admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || 'jaeseanjae';

    // Verify password using constant-time comparison to prevent timing attacks
    const passwordMatch = crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(adminPassword)
    ).valueOf();

    if (!passwordMatch) {
      console.log('[ADMIN-VERIFY] PASSWORD MISMATCH - FAILED');
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Password correct - create secure session
    console.log('[ADMIN-VERIFY] PASSWORD MATCH - Creating session');
    
    // Generate cryptographically secure session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hour session
    
    adminSessions.set(sessionId, {
      createdAt: Date.now(),
      expiresAt: expiresAt,
    });

    // Create response with httpOnly cookie (secure, cannot be accessed by JavaScript)
    const response = NextResponse.json(
      { success: true, message: 'Admin session created' },
      { status: 200 }
    );

    // Set httpOnly, Secure (HTTPS only on production), SameSite cookies
    response.cookies.set('admin_session', sessionId, {
      httpOnly: true, // Cannot be accessed by JavaScript (prevents XSS theft)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[ADMIN-VERIFY] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { authorized: false },
        { status: 200 }
      );
    }

    const session = adminSessions.get(sessionId);
    
    if (!session || session.expiresAt < Date.now()) {
      // Session expired or invalid
      adminSessions.delete(sessionId);
      return NextResponse.json(
        { authorized: false },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { authorized: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[ADMIN-VERIFY] GET error:', error);
    return NextResponse.json(
      { authorized: false },
      { status: 200 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    try {
      const passwordMatch = crypto.timingSafeEqual(
        Buffer.from(password),
        Buffer.from(adminPassword)
      );

      if (!passwordMatch) {
        console.log('[ADMIN-VERIFY] PASSWORD MISMATCH - FAILED');
        return NextResponse.json(
          { success: false, error: 'Invalid password' },
          { status: 401 }
        );
      }
    } catch (error) {
      // timingSafeEqual throws if buffers are different lengths
      console.log('[ADMIN-VERIFY] PASSWORD MISMATCH - FAILED');
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Password correct - create secure token using JWT approach
    console.log('[ADMIN-VERIFY] PASSWORD MATCH - Creating admin token');
    
    // Generate a random session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Create response with httpOnly cookie
    const response = NextResponse.json(
      { success: true, message: 'Admin session created' },
      { status: 200 }
    );

    // Set httpOnly, Secure (HTTPS only on production), SameSite cookies
    response.cookies.set('admin_session', sessionToken, {
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
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { authorized: false },
        { status: 200 }
      );
    }

    // Just check if token exists and has valid format (64 hex chars)
    const isValidToken = /^[a-f0-9]{64}$/.test(sessionToken);
    
    return NextResponse.json(
      { authorized: isValidToken },
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

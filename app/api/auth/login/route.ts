import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('[LOGIN] Request received');
    
    let body;
    try {
      body = await req.json();
      console.log('[LOGIN] Body parsed:', { hasEmail: !!body.email });
    } catch (parseError: any) {
      console.error('[LOGIN] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { email, password, securityPhrase } = body;

    if (!email || !password || !securityPhrase) {
      console.log('[LOGIN] Missing fields:', { email: !!email, password: !!password, securityPhrase: !!securityPhrase });
      return NextResponse.json(
        { error: 'Missing required fields. Please fill all fields.' },
        { status: 400 }
      );
    }

    // Find user
    let user;
    try {
      user = await db.getUserByEmail(email.trim().toLowerCase());
      if (!user) {
        console.log('[LOGIN] User not found for email:', email.trim().toLowerCase());
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      console.log('[LOGIN] User found:', user.id);
    } catch (dbError: any) {
      console.error('[LOGIN] Database lookup error:', dbError);
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500 }
      );
    }

    // Verify password
    let isValidPassword: boolean;
    try {
      isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        console.log('[LOGIN] Invalid password');
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      console.log('[LOGIN] Password verified');
    } catch (verifyError: any) {
      console.error('[LOGIN] Password verification error:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify password. Please try again.' },
        { status: 500 }
      );
    }

    // Verify security phrase
    let isValidPhrase: boolean;
    try {
      isValidPhrase = await verifyPassword(securityPhrase.trim(), user.securityPhrase);
      if (!isValidPhrase) {
        console.log('[LOGIN] Invalid security phrase');
        return NextResponse.json(
          { error: 'Invalid security phrase' },
          { status: 401 }
        );
      }
      console.log('[LOGIN] Security phrase verified');
    } catch (verifyError: any) {
      console.error('[LOGIN] Phrase verification error:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify security phrase. Please try again.' },
        { status: 500 }
      );
    }

    // Generate token
    let token: string;
    try {
      token = generateToken(user.id);
      console.log('[LOGIN] Token generated successfully');
    } catch (tokenError: any) {
      console.error('[LOGIN] Token generation error:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate authentication token. Please try again.' },
        { status: 500 }
      );
    }

    const responseData = { 
      token, 
      userId: user.id, 
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    console.log('[LOGIN] SUCCESS - Returning response with token');
    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[LOGIN] Unexpected error:', error);
    console.error('[LOGIN] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to login. Please try again.' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

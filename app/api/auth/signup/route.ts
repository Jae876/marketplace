import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('[SIGNUP] Request received');
    
    let body;
    try {
      body = await req.json();
      console.log('[SIGNUP] Body parsed:', { hasFirstName: !!body.firstName, hasEmail: !!body.email });
    } catch (parseError: any) {
      console.error('[SIGNUP] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { firstName, lastName, username, email, password, securityPhrase } = body;

    // Validate all required fields
    if (!firstName || !lastName || !username || !email || !password || !securityPhrase) {
      console.log('[SIGNUP] Missing fields:', { 
        firstName: !!firstName, 
        lastName: !!lastName, 
        username: !!username, 
        email: !!email, 
        password: !!password, 
        securityPhrase: !!securityPhrase 
      });
      return NextResponse.json(
        { error: 'Missing required fields. Please fill all fields.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate security phrase format
    const phraseWords = securityPhrase.trim().split(/\s+/).filter((w: string) => w.length > 0);
    if (phraseWords.length !== 4) {
      return NextResponse.json(
        { error: 'Security phrase must be exactly 4 words' },
        { status: 400 }
      );
    }

    // Check if user exists by email or username
    try {
      const existingUserByEmail = db.getUserByEmail(email.trim().toLowerCase());
      if (existingUserByEmail) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }

      const existingUserByUsername = db.getUserByUsername(username.trim());
      if (existingUserByUsername) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        );
      }
    } catch (dbCheckError: any) {
      console.error('[SIGNUP] Database check error:', dbCheckError);
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500 }
      );
    }

    // Hash password and security phrase
    let hashedPassword: string;
    let hashedPhrase: string;
    try {
      console.log('[SIGNUP] Hashing password...');
      hashedPassword = await hashPassword(password);
      hashedPhrase = await hashPassword(securityPhrase.trim());
      console.log('[SIGNUP] Passwords hashed successfully');
    } catch (hashError: any) {
      console.error('[SIGNUP] Hash error:', hashError);
      return NextResponse.json(
        { error: 'Failed to process password. Please try again.' },
        { status: 500 }
      );
    }
    
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create user in database
    try {
      console.log('[SIGNUP] Creating user in database...');
      db.createUser({
        id: userId,
        email: email.trim().toLowerCase(),
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: hashedPassword,
        securityPhrase: hashedPhrase,
        createdAt: new Date().toISOString(),
      });
      console.log('[SIGNUP] User created successfully:', userId);
    } catch (dbError: any) {
      console.error('[SIGNUP] Database create error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create user account. Please try again.' },
        { status: 500 }
      );
    }

    // Generate token
    let token: string;
    try {
      console.log('[SIGNUP] Generating token...');
      token = generateToken(userId);
      console.log('[SIGNUP] Token generated successfully');
    } catch (tokenError: any) {
      console.error('[SIGNUP] Token generation error:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate authentication token. Please try again.' },
        { status: 500 }
      );
    }

    const responseData = { 
      token, 
      userId, 
      email: email.trim().toLowerCase(),
      username: username.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    console.log('[SIGNUP] SUCCESS - Returning response with token');
    return NextResponse.json(responseData, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[SIGNUP] Unexpected error:', error);
    console.error('[SIGNUP] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to create account. Please try again.' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

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

    // Create welcome message for new user
    try {
      console.log('[SIGNUP] Creating welcome message for new user...');
      const welcomeContent = `Welcome to Russian Roulette! 🎉
We're thrilled to have you join our community as a new user. Here at Russian Roulette, you can securely browse, buy, and sell premium digital products, accounts, services, and more — all powered by cryptocurrency transactions in a safe, escrow-protected environment.

To help you get started smoothly and ensure a positive experience for everyone, please take a moment to review these important platform guidelines:

═══════════════════════════════════════════════════════════════

📋 HOW TRANSACTIONS WORK

1. BROWSING & ORDERING
   Explore the Marketplace to find products that interest you. When you're ready, place your order — your funds will be held securely in escrow (not released to the seller yet).

2. DELIVERY OF ITEM
   • The seller will deliver your purchased item via two channels for your convenience and verification:
      ✓ Sent to the registered email associated with your account.
      ✓ Also delivered directly to your inbox/messages on the Russian Roulette platform. 
   • Check both your email (including spam/junk folder) and your platform inbox shortly after the seller marks the order as "in progress" or "shipped."

3. VERIFICATION & CONFIRMATION
   • Once you receive and fully verify the item (test login, check details, ensure it matches the product description), confirm that everything is correct and satisfactory.
   • Only after you confirm should you release the funds from escrow to the seller. This protects both buyers and sellers.

4. RELEASING FUNDS
   • Go to your Active Orders section.
   • If satisfied → Click to release escrow (funds go to the seller).
   • If there's an issue → Open a dispute immediately so our support team can assist. Do not release funds if the item is incorrect, not delivered, or doesn't work as described.

═══════════════════════════════════════════════════════════════

💡 QUICK TIPS FOR NEW USERS

✓ Always double-check product descriptions before purchasing.
✓ Keep your account secure — never share login credentials outside the platform.
✓ Use only cryptocurrencies supported on the platform for deposits and transactions.
✓ If anything feels off or you need help, reach out via support or check the Help section.

═══════════════════════════════════════════════════════════════

Your safety and satisfaction are our top priorities. We use escrow to make every deal fair and secure.

Happy shopping, and welcome aboard, ${firstName} (@${username})! 🚀`;

      db.createItemMessage({
        id: `welcome_${userId}`,
        transactionId: `welcome_${Date.now()}`,
        buyerId: userId,
        sellerId: 'system',
        productName: '👋 Welcome to Russian Roulette',
        itemContent: welcomeContent,
        amount: 0,
        cryptocurrency: 'WELCOME',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      console.log('[SIGNUP] Welcome message created successfully');
    } catch (welcomeError: any) {
      console.error('[SIGNUP] Warning: Failed to create welcome message:', welcomeError);
      // Don't fail signup if welcome message creation fails
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

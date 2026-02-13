import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    console.log('[ADMIN-VERIFY] Password received:', !!password);
    console.log('[ADMIN-VERIFY] ADMIN_PASSWORD env:', !!process.env.ADMIN_PASSWORD);
    console.log('[ADMIN-VERIFY] Env value:', process.env.ADMIN_PASSWORD);

    if (!password) {
      console.error('[ADMIN-VERIFY] No password provided');
      return NextResponse.json(
        { success: false, error: 'Password required' },
        { status: 400 }
      );
    }

    // Get admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || 'jaeseanjae';
    
    console.log('[ADMIN-VERIFY] Admin password from env:', adminPassword);
    console.log('[ADMIN-VERIFY] Comparing:', password, '===', adminPassword);
    console.log('[ADMIN-VERIFY] Match:', password === adminPassword);

    // Verify password
    if (password === adminPassword) {
      console.log('[ADMIN-VERIFY] PASSWORD MATCH - SUCCESS');
      return NextResponse.json(
        { success: true, message: 'Password verified' },
        { status: 200 }
      );
    } else {
      console.log('[ADMIN-VERIFY] PASSWORD MISMATCH - FAILED');
      console.log('[ADMIN-VERIFY] Received:', JSON.stringify(password));
      console.log('[ADMIN-VERIFY] Expected:', JSON.stringify(adminPassword));
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('[ADMIN-VERIFY] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

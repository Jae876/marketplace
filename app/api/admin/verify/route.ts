import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password required' },
        { status: 400 }
      );
    }

    // Get admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || 'jaeseanjae';

    // Verify password
    if (password === adminPassword) {
      return NextResponse.json(
        { success: true, message: 'Password verified' },
        { status: 200 }
      );
    } else {
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

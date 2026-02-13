import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[ADMIN-WALLETS] GET request received');
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const wallets = db.getWalletConfig();
    console.log('[ADMIN-WALLETS] Returning wallet config');
    return NextResponse.json({ wallets }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[ADMIN-WALLETS] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log('[ADMIN-WALLETS] PUT request received');
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let wallets;
    try {
      const bodyText = await req.text();
      console.log('[ADMIN-WALLETS] Request body:', bodyText);
      
      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          { error: 'Empty request body' },
          { status: 400 }
        );
      }
      
      wallets = JSON.parse(bodyText);
      console.log('[ADMIN-WALLETS] Parsed wallets:', wallets);
    } catch (parseError: any) {
      console.error('[ADMIN-WALLETS] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate wallet format
    if (!wallets || typeof wallets !== 'object') {
      return NextResponse.json(
        { error: 'Invalid wallet data format' },
        { status: 400 }
      );
    }

    try {
      db.updateWalletConfig(wallets);
      console.log('[ADMIN-WALLETS] Wallet config updated successfully');
    } catch (dbError: any) {
      console.error('[ADMIN-WALLETS] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update wallet configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[ADMIN-WALLETS] PUT error:', error);
    console.error('[ADMIN-WALLETS] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}


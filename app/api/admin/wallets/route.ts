import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminSession } from '@/lib/auth';

// CRITICAL: Force PostgreSQL (Neon) for wallet persistence on Vercel
// /tmp on Vercel is ephemeral and data is lost on redeployment
// PostgreSQL ensures wallets persist across all deployments and refreshes
let dbPostgres: any = null;
try {
  const { dbPostgres: pgModule } = require('@/lib/db-postgres');
  dbPostgres = pgModule;
} catch (error) {
  console.warn('[WALLETS-ROUTE] PostgreSQL module not available, using fallback');
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Never cache wallet config

export async function GET(req: NextRequest) {
  try {
    // Verify admin session
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get wallets from PostgreSQL
    let wallets = {};
    if (dbPostgres && process.env.DATABASE_URL) {
      wallets = await dbPostgres.getWalletConfig();
    } else {
      wallets = await db.getWalletConfig();
    }
    
    return NextResponse.json({ wallets }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (error: any) {
    console.error('[WALLETS-GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Verify admin session
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bodyText = await req.text();
    
    if (!bodyText || bodyText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }
    
    let wallets;
    try {
      wallets = JSON.parse(bodyText);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    if (!wallets || typeof wallets !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    try {
      // Save wallets to database
      if (dbPostgres && process.env.DATABASE_URL) {
        await dbPostgres.updateWalletConfig(wallets);
      } else {
        await db.updateWalletConfig(wallets);
      }

      return NextResponse.json({ success: true }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    } catch (dbError: any) {
      console.error('[WALLETS-PUT] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save wallets' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[WALLETS-PUT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


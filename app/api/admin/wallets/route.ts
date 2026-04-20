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
    console.log('[ADMIN-WALLETS-GET] Request received');
    
    // Verify admin session from httpOnly cookie
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or missing admin session' },
        { status: 401 }
      );
    }

    // Use PostgreSQL if available for persistence on Vercel
    let wallets = {};
    if (dbPostgres && process.env.DATABASE_URL) {
      console.log('[ADMIN-WALLETS-GET] Using PostgreSQL backend');
      wallets = await dbPostgres.getWalletConfig();
    } else {
      console.log('[ADMIN-WALLETS-GET] Fallback: Using JSON backend');
      wallets = await db.getWalletConfig();
    }

    const configuredCount = Object.values(wallets).filter(v => v && typeof v === 'string' && v.trim()).length;
    console.log(`[ADMIN-WALLETS-GET] Returning ${configuredCount}/${Object.keys(wallets).length || 70} configured wallets`);
    
    return NextResponse.json({ wallets }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[ADMIN-WALLETS-GET] Error:', error);
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
    console.log('[ADMIN-WALLETS-PUT] Request received');
    
    // Verify admin session from httpOnly cookie
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or missing admin session' },
        { status: 401 }
      );
    }

    let wallets;
    try {
      const bodyText = await req.text();
      console.log('[ADMIN-WALLETS-PUT] Request body length:', bodyText.length);
      
      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          { error: 'Empty request body' },
          { status: 400 }
        );
      }
      
      wallets = JSON.parse(bodyText);
      const walletCount = Object.keys(wallets || {}).length;
      console.log('[ADMIN-WALLETS-PUT] Parsed wallets:', { count: walletCount, non_empty: Object.values(wallets).filter(v => v).length });
    } catch (parseError: any) {
      console.error('[ADMIN-WALLETS-PUT] JSON parse error:', parseError);
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
      // Use PostgreSQL if available for persistence on Vercel
      if (dbPostgres && process.env.DATABASE_URL) {
        console.log('[ADMIN-WALLETS-PUT] Saving to PostgreSQL backend');
        console.log('[ADMIN-WALLETS-PUT] Wallet count before save:', Object.keys(wallets).length);
        await dbPostgres.updateWalletConfig(wallets);
        console.log('[ADMIN-WALLETS-PUT] PostgreSQL save completed');
        
        // Verify what was saved
        const verification = await dbPostgres.getWalletConfig();
        console.log('[ADMIN-WALLETS-PUT] Verification - saved wallets count:', Object.keys(verification).length);
      } else {
        console.log('[ADMIN-WALLETS-PUT] Fallback: Saving to JSON backend');
        await db.updateWalletConfig(wallets);
      }

      const configuredCount = Object.values(wallets).filter(v => v && typeof v === 'string' && v.trim()).length;
      console.log(`[ADMIN-WALLETS-PUT] Successfully saved ${configuredCount} wallet addresses`);
    } catch (dbError: any) {
      console.error('[ADMIN-WALLETS-PUT] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update wallet configuration: ' + (dbError.message || 'Unknown error') },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[ADMIN-WALLETS-PUT] Error:', error);
    console.error('[ADMIN-WALLETS-PUT] Error stack:', error.stack);
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


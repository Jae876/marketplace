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
    let wallets: Record<string, any> = {};
    if (dbPostgres && process.env.DATABASE_URL) {
      console.log('[ADMIN-WALLETS-GET] Using PostgreSQL backend');
      wallets = await dbPostgres.getWalletConfig();
      
      // Safety check: if wallets is null/undefined/not an object, default to empty
      if (!wallets || typeof wallets !== 'object' || Array.isArray(wallets)) {
        console.log('[ADMIN-WALLETS-GET] WARNING: Invalid wallets data from PostgreSQL:', typeof wallets);
        wallets = {};
      }
    } else {
      console.log('[ADMIN-WALLETS-GET] Fallback: Using JSON backend');
      wallets = await db.getWalletConfig();
    }

    // DEBUG: Log what we're returning
    console.log('[ADMIN-WALLETS-GET] Returning wallets:', {
      total_keys: Object.keys(wallets).length,
      non_empty: Object.values(wallets).filter(v => v && typeof v === 'string' && (v as string).trim()).length,
      sample: Object.entries(wallets).slice(0, 3).map(([k, v]) => [k, typeof v, typeof v === 'string' ? (v as string).substring(0, 20) : 'NOT_STRING'])
    });
    
    return NextResponse.json({ wallets }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
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
      console.log('[ADMIN-WALLETS-PUT] Request body size:', bodyText.length, 'bytes');
      
      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          { error: 'Empty request body' },
          { status: 400 }
        );
      }
      
      wallets = JSON.parse(bodyText);
      
      // CRITICAL: Clean the wallets object - ensure all values are strings or empty
      const cleanedWallets: Record<string, string> = {};
      Object.entries(wallets).forEach(([key, value]) => {
        cleanedWallets[key] = (typeof value === 'string' ? value : '').trim();
      });
      
      const walletCount = Object.keys(cleanedWallets).length;
      const configuredCount = Object.values(cleanedWallets).filter(v => v && v.trim()).length;
      
      console.log('[ADMIN-WALLETS-PUT] Parsed and cleaned wallets:', {
        total: walletCount,
        configured: configuredCount,
        first_few_keys: Object.keys(cleanedWallets).slice(0, 5)
      });
    } catch (parseError: any) {
      console.error('[ADMIN-WALLETS-PUT] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate wallet format
    if (!cleanedWallets || typeof cleanedWallets !== 'object') {
      return NextResponse.json(
        { error: 'Invalid wallet data format' },
        { status: 400 }
      );
    }

    try {
      // Use PostgreSQL if available - store complete wallet object (all 70 slots)
      if (dbPostgres && process.env.DATABASE_URL) {
        console.log('[ADMIN-WALLETS-PUT] Saving cleaned wallet state to PostgreSQL');
        await dbPostgres.updateWalletConfig(cleanedWallets);
        
        // Verify immediately what was saved
        const saved = await dbPostgres.getWalletConfig();
        const savedCount = Object.values(saved).filter(v => typeof v === 'string' && v.trim()).length;
        console.log('[ADMIN-WALLETS-PUT] Verification: PostgreSQL now has', savedCount, 'configured wallets');
      } else {
        console.log('[ADMIN-WALLETS-PUT] Fallback: Saving to JSON backend');
        await db.updateWalletConfig(cleanedWallets);
      }

      const configuredCount = Object.values(cleanedWallets).filter(v => v && v.trim()).length;
      console.log(`[ADMIN-WALLETS-PUT] Success: saved ${configuredCount} configured wallets`);
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
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (error: any) {
    console.error('[ADMIN-WALLETS-PUT] Unexpected error:', error);
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


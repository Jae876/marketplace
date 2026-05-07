import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NO_SSL;

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_URL_NO_SSL environment variable is required');
}

const sql = neon(connectionString);

/**
 * Clean up old/broken products (DELETE endpoint)
 */
export async function DELETE(req: NextRequest) {
  try {
    console.log('[CLEANUP] Starting cleanup...');
    
    // Delete all external products from theowlet.store sync
    try {
      await sql`DELETE FROM external_products WHERE source = 'theowlet.store'`;
      console.log('[CLEANUP] Deleted external products');
    } catch (e) {
      console.log('[CLEANUP] No external products to delete');
    }

    // Delete products that were from old broken seed (with very low prices like $0.10-$0.20)
    try {
      const result = await sql`
        DELETE FROM products 
        WHERE price < 1 
        AND name IN ('Tinder Plus - 1 Month', 'Facebook Dating Setup', 'Canva Pro - 3 Months', 'Adobe Creative Cloud - 1 Month', 'Xbox Game Pass - 1 Month')
      `;
      console.log('[CLEANUP] Deleted low-priced test products');
    } catch (e) {
      console.log('[CLEANUP] No low-priced products to delete');
    }

    return NextResponse.json({
      message: 'Cleanup complete',
      status: 'success'
    });
  } catch (error: any) {
    console.error('[CLEANUP] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}

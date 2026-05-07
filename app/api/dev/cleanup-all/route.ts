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
    console.log('[CLEANUP] Starting full cleanup...');
    
    // Delete ALL products to start fresh
    try {
      const result = await sql`DELETE FROM products`;
      console.log('[CLEANUP] Deleted all internal products');
    } catch (e) {
      console.log('[CLEANUP] Error deleting products:', e);
    }

    // Delete all external products
    try {
      await sql`DELETE FROM external_products`;
      console.log('[CLEANUP] Deleted all external products');
    } catch (e) {
      console.log('[CLEANUP] Error deleting external products:', e);
    }

    return NextResponse.json({
      message: 'Cleanup complete - all products deleted',
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

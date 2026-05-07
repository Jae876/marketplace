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
 * Delete all external products (for cleanup)
 */
export async function DELETE(req: NextRequest) {
  try {
    console.log('[CLEANUP] Deleting all external products from database');
    
    // Delete all external products
    const result = await sql`DELETE FROM external_products`;
    
    console.log('[CLEANUP] Deleted all external products');
    
    return NextResponse.json({
      message: `Cleanup complete - all external products deleted`,
      deleted: 'all'
    });
  } catch (error: any) {
    console.error('[CLEANUP] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}

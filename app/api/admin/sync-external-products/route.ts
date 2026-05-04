import { NextRequest, NextResponse } from 'next/server';
import { dbPostgres } from '@/lib/db-postgres';
import { verifyAdminSession } from '@/lib/auth';
import { scrapeTheOwletProducts, categorizeProduct } from '@/lib/scrapers/theowlet-scraper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple UUID-like ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin session
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[SYNC-PRODUCTS] Starting product sync from theowlet.store');

    // Scrape products from theowlet.store
    const scrapedProducts = await scrapeTheOwletProducts();

    if (scrapedProducts.length === 0) {
      return NextResponse.json(
        { message: 'No products found to sync', synced: 0 },
        { status: 200 }
      );
    }

    let syncedCount = 0;
    let errorCount = 0;

    // Sync each product
    for (const scrapedProduct of scrapedProducts) {
      try {
        // Auto-categorize product
        const { type, region } = categorizeProduct(scrapedProduct);

        // Prepare product data for database
        const productData = {
          id: generateId(),
          source: 'theowlet.store',
          sourceId: scrapedProduct.sourceId,
          name: scrapedProduct.name,
          description: scrapedProduct.description,
          originalPrice: scrapedProduct.price,
          currentPrice: scrapedProduct.price,
          region,
          type,
          size: undefined,
          image: scrapedProduct.image
        };

        // Sync to database (creates new or updates existing)
        await dbPostgres.syncExternalProduct(scrapedProduct.sourceId, productData);
        syncedCount++;
        console.log(`[SYNC-PRODUCTS] Synced: ${scrapedProduct.name}`);
      } catch (productError) {
        errorCount++;
        console.error(`[SYNC-PRODUCTS] Error syncing product:`, productError);
      }
    }

    console.log(
      `[SYNC-PRODUCTS] Sync complete - Synced: ${syncedCount}, Errors: ${errorCount}`
    );

    return NextResponse.json({
      message: 'Product sync completed',
      synced: syncedCount,
      errors: errorCount,
      total: scrapedProducts.length
    });
  } catch (error: any) {
    console.error('[SYNC-PRODUCTS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - Returns external products (for checking sync status)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin session
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const externalProducts = await dbPostgres.getExternalProducts();

    return NextResponse.json({
      external_products: externalProducts,
      total: externalProducts.length
    });
  } catch (error: any) {
    console.error('[SYNC-PRODUCTS] Error fetching external products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { dbPostgres } from '@/lib/db-postgres';
import { scrapeTheOwletProducts, categorizeProduct } from '@/lib/scrapers/theowlet-scraper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple UUID-like ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * DEVELOPMENT ONLY - Test endpoint to trigger product sync
 * This endpoint is for development/testing purposes
 * In production, use /api/admin/sync-external-products
 */
export async function POST(req: NextRequest) {
  try {
    // Development check - only allow in dev environment
    const isDevMode = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    console.log('[DEV-SYNC] Starting manual sync...');
    console.log('[DEV-SYNC] Environment:', process.env.NODE_ENV);
    console.log('[DEV-SYNC] Dev mode:', isDevMode);

    // Scrape products from theowlet.store
    const scrapedProducts = await scrapeTheOwletProducts();
    console.log('[DEV-SYNC] Scraped products from theowlet.store:', scrapedProducts.length);

    if (scrapedProducts.length === 0) {
      return NextResponse.json(
        { 
          message: 'No products found to sync', 
          synced: 0,
          warning: 'Scraper may not be working correctly. Check theowlet.store accessibility.'
        },
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
        console.log(`[DEV-SYNC] Synced: ${scrapedProduct.name}`);
      } catch (productError) {
        errorCount++;
        console.error(`[DEV-SYNC] Error syncing product:`, productError);
      }
    }

    console.log(`[DEV-SYNC] Sync complete - Synced: ${syncedCount}, Errors: ${errorCount}`);

    // Fetch all external products to verify
    const allExternal = await dbPostgres.getExternalProducts();
    console.log('[DEV-SYNC] Total external products in database now:', allExternal.length);

    return NextResponse.json({
      message: 'Product sync completed',
      synced: syncedCount,
      errors: errorCount,
      total: scrapedProducts.length,
      databaseTotal: allExternal.length,
      sampleProducts: allExternal.slice(0, 3)
    });
  } catch (error: any) {
    console.error('[DEV-SYNC] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - Returns test status
 */
export async function GET(req: NextRequest) {
  try {
    const externalProducts = await dbPostgres.getExternalProducts();
    
    return NextResponse.json({
      message: 'Development sync test endpoint',
      status: 'ready',
      databaseProducts: externalProducts.length,
      sampleProducts: externalProducts.slice(0, 2),
      instructions: 'POST to this endpoint to trigger sync from theowlet.store'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get products' },
      { status: 500 }
    );
  }
}

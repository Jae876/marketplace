import { NextRequest, NextResponse } from 'next/server';
import { dbPostgres } from '@/lib/db-postgres';
import { scrapeTheOwletProducts, categorizeProduct } from '@/lib/scrapers/theowlet-scraper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * DEV ONLY: One-time product pull endpoint
 * This endpoint bypasses authentication for development purposes
 * It pulls products from theowlet.store and stores them
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[DEV-SYNC] Starting one-time product pull from theowlet.store');

    // Scrape products
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
        const { type, region } = categorizeProduct(scrapedProduct);

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

        await dbPostgres.syncExternalProduct(scrapedProduct.sourceId, productData);
        syncedCount++;
        console.log(`[DEV-SYNC] Synced: ${scrapedProduct.name}`);
      } catch (productError) {
        errorCount++;
        console.error(`[DEV-SYNC] Error syncing product:`, productError);
      }
    }

    console.log(
      `[DEV-SYNC] Complete - Synced: ${syncedCount}, Errors: ${errorCount}`
    );

    return NextResponse.json({
      message: 'Product pull completed',
      synced: syncedCount,
      errors: errorCount,
      total: scrapedProducts.length
    });
  } catch (error: any) {
    console.error('[DEV-SYNC] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Return synced products
    const products = await dbPostgres.getExternalProducts();
    return NextResponse.json({
      external_products: products,
      count: products.length
    });
  } catch (error: any) {
    console.error('[DEV-SYNC] GET Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

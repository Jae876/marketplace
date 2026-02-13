import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[PRODUCTS] GET request received');
    
    const { region, type, search } = Object.fromEntries(
      new URL(req.url).searchParams
    );

    let products = await db.getAllProducts();
    console.log('[PRODUCTS] Total products found:', products.length);

    // Filter by region
    if (region) {
      products = products.filter((p: any) => 
        p.region.toLowerCase().includes(region.toLowerCase())
      );
    }

    // Filter by type
    if (type) {
      products = products.filter((p: any) => 
        p.type.toLowerCase().includes(type.toLowerCase())
      );
    }

    // Search by name/description
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((p: any) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    console.log('[PRODUCTS] Returning products:', products.length);
    return NextResponse.json({ products }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[PRODUCTS] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', products: [] },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}


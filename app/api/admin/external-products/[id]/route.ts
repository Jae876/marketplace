import { NextRequest, NextResponse } from 'next/server';
import { dbPostgres } from '@/lib/db-postgres';
import { verifyAdminSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await dbPostgres.getExternalProductById(params.id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('[EXTERNAL-PRODUCT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();

    // Validate updates
    const allowedFields = [
      'name',
      'description',
      'currentPrice',
      'region',
      'type',
      'size',
      'image'
    ];

    const sanitizedUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    // Update product
    await dbPostgres.updateExternalProduct(params.id, sanitizedUpdates);

    // Fetch updated product
    const product = await dbPostgres.getExternalProductById(params.id);

    return NextResponse.json({
      message: 'Product updated',
      product
    });
  } catch (error: any) {
    console.error('[EXTERNAL-PRODUCT] Update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

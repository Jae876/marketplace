import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('[ADMIN-PRODUCTS] POST request received');
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // For admin token, skip user lookup
    if (decoded.userId !== 'admin') {
      const user = db.getUserById(decoded.userId);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    let body;
    try {
      body = await req.json();
      console.log('[ADMIN-PRODUCTS] Body parsed:', { hasName: !!body.name, hasPrice: !!body.price });
    } catch (parseError: any) {
      console.error('[ADMIN-PRODUCTS] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { name, description, price, region, type, size, image } = body;

    if (!name || !description || !price || !region || !type) {
      console.log('[ADMIN-PRODUCTS] Missing fields:', { name: !!name, description: !!description, price: !!price, region: !!region, type: !!type });
      return NextResponse.json(
        { error: 'Missing required fields. Please fill all required fields.' },
        { status: 400 }
      );
    }

    // Validate price is a number
    const priceNum = typeof price === 'number' ? price : parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { error: 'Price must be a valid positive number' },
        { status: 400 }
      );
    }

    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('[ADMIN-PRODUCTS] Creating product...');
      db.createProduct({
        id: productId,
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        region: region.trim(),
        type: type.trim(),
        size: size ? size.toString().trim() : undefined,
        image: image ? image.trim() : undefined,
        createdAt: new Date().toISOString(),
      });
      console.log('[ADMIN-PRODUCTS] Product created successfully:', productId);
    } catch (dbError: any) {
      console.error('[ADMIN-PRODUCTS] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create product. Please try again.' },
        { status: 500 }
      );
    }

    console.log('[ADMIN-PRODUCTS] SUCCESS - Returning response');
    return NextResponse.json({ 
      success: true, 
      productId 
    }, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[ADMIN-PRODUCTS] Unexpected error:', error);
    console.error('[ADMIN-PRODUCTS] Error stack:', error.stack);
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
    console.log('[ADMIN-PRODUCTS] PUT request received');
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('[ADMIN-PRODUCTS] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      );
    }

    // Clean up updates
    if (updates.price) {
      updates.price = typeof updates.price === 'number' ? updates.price : parseFloat(updates.price);
      if (isNaN(updates.price) || updates.price <= 0) {
        return NextResponse.json(
          { error: 'Price must be a valid positive number' },
          { status: 400 }
        );
      }
    }

    if (updates.name) updates.name = updates.name.trim();
    if (updates.description) updates.description = updates.description.trim();
    if (updates.region) updates.region = updates.region.trim();
    if (updates.type) updates.type = updates.type.trim();
    if (updates.size) updates.size = updates.size.toString().trim();
    if (updates.image) updates.image = updates.image.trim();

    const success = db.updateProduct(id, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('[ADMIN-PRODUCTS] Product updated successfully:', id);
    return NextResponse.json({ success: true }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[ADMIN-PRODUCTS] Update error:', error);
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

export async function DELETE(req: NextRequest) {
  try {
    console.log('[ADMIN-PRODUCTS] DELETE request received');
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      );
    }

    const success = db.deleteProduct(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('[ADMIN-PRODUCTS] Product deleted successfully:', id);
    return NextResponse.json({ success: true }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[ADMIN-PRODUCTS] Delete error:', error);
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


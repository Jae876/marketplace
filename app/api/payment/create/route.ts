import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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

    const { productId, cryptocurrency, quantity = 1 } = await req.json();

    if (!productId || !cryptocurrency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const product = await db.getProduct(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate quantity
    const qty = parseInt(quantity) || 1;
    if (qty < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Check if product has size limit and validate quantity
    if (product.size) {
      const availablePieces = parseInt(product.size);
      if (isNaN(availablePieces) || qty > availablePieces) {
        return NextResponse.json(
          { error: `Only ${availablePieces} pieces available. You requested ${qty}.` },
          { status: 400 }
        );
      }
    }

    // Get admin wallet for the selected cryptocurrency
    const walletConfig = await db.getWalletConfig();
    const walletAddress = walletConfig[cryptocurrency as keyof typeof walletConfig];
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: `Wallet address not configured for ${cryptocurrency}. Please contact admin.` },
        { status: 400 }
      );
    }

    // Calculate total amount (price * quantity)
    const totalAmount = product.price * qty;

    // Create transaction
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.createTransaction({
      id: transactionId,
      productId,
      buyerId: decoded.userId,
      sellerId: 'system', // In production, link to actual seller
      amount: totalAmount,
      cryptocurrency,
      walletAddress: walletAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      transactionId,
      walletAddress: walletAddress,
      amount: totalAmount,
      quantity: qty,
      cryptocurrency,
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[PAYMENT] Error:', error);
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


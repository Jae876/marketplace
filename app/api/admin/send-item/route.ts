import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST: Send item to buyer's inbox
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId, itemContent } = await request.json();

    if (!transactionId || !itemContent) {
      return NextResponse.json(
        { error: 'transactionId and itemContent are required' },
        { status: 400 }
      );
    }

    // Get transaction
    const transaction = db.getTransactionById(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status !== 'paid' && transaction.status !== 'deposit_confirmed') {
      return NextResponse.json(
        { error: 'Transaction must be paid' },
        { status: 400 }
      );
    }

    const product = db.getProductById(transaction.productId);
    const buyer = db.getUserById(transaction.buyerId);

    // Create item message
    const itemMessage = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      transactionId: transaction.id,
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      productName: product?.name || 'Unknown Product',
      itemContent: itemContent,
      amount: transaction.amount,
      cryptocurrency: transaction.cryptocurrency,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Save item message
    db.createItemMessage(itemMessage);

    // Update transaction with item delivery content
    db.updateTransaction(transaction.id, {
      itemDeliveryContent: itemContent,
      status: 'delivered',
    });

    return NextResponse.json({
      success: true,
      message: 'Item sent to buyer inbox',
      itemMessage,
      buyerName: `${buyer?.firstName} ${buyer?.lastName}`,
      buyerEmail: buyer?.email,
    });
  } catch (error) {
    console.error('Send item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Fetch all paid orders (deposit_confirmed status) ready for item delivery
export async function GET(request: NextRequest) {
  try {
    // Verify admin session from httpOnly cookie
    if (!verifyAdminSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all transactions in paid status (payment received, awaiting item delivery)
    const transactions = await db.getTransactions();
    const paidOrders = transactions.filter((t: any) => t.status === 'paid' || t.status === 'deposit_confirmed');

    // Build order details with buyer and product info
    const ordersWithDetails = await Promise.all(paidOrders.map(async (tx: any) => {
      const buyer = await db.getUserById(tx.buyerId);
      const product = await db.getProduct(tx.productId);
      
      return {
        transactionId: tx.id,
        buyerId: tx.buyerId,
        buyerName: `${buyer?.firstName || 'Unknown'} ${buyer?.lastName || ''}`,
        buyerEmail: buyer?.email || 'Unknown',
        buyerUsername: buyer?.username || 'Unknown',
        productName: product?.name || 'Unknown Product',
        amount: tx.amount,
        cryptocurrency: tx.cryptocurrency,
        createdAt: tx.createdAt,
        status: tx.status,
        itemDelivered: !!tx.itemDeliveryContent,
      };
    }));

    return NextResponse.json({
      orders: ordersWithDetails,
      total: ordersWithDetails.length,
      success: true,
    });
  } catch (error) {
    console.error('Admin orders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Send item to buyer's inbox
export async function POST(request: NextRequest) {
  try {
    // Verify admin session from httpOnly cookie
    if (!verifyAdminSession(request)) {
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
    const transaction = await db.getTransactionById(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status !== 'paid' && transaction.status !== 'deposit_confirmed') {
      return NextResponse.json(
        { error: 'Transaction must be paid' },
        { status: 400 }
      );
    }

    const product = await db.getProduct(transaction.productId);
    const buyer = await db.getUserById(transaction.buyerId);

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
    await db.createItemMessage(itemMessage);

    // Update transaction with item delivery content
    await db.updateTransaction(transaction.id, {
      itemDeliveryContent: itemContent,
      status: 'delivered', // Change status to 'delivered' once item is sent
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

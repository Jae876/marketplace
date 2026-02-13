import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const messages: any[] = [];

    // Get welcome message first (for new users)
    const itemMessages = await db.getUserItemMessages(decoded.userId);
    const welcomeMessage = itemMessages.find(m => m.id.startsWith('welcome_'));
    
    if (welcomeMessage) {
      messages.push({
        id: `welcome-${welcomeMessage.id}`,
        title: welcomeMessage.productName,
        content: welcomeMessage.itemContent,
        type: 'system',
        transactionId: welcomeMessage.transactionId,
        isRead: welcomeMessage.isRead,
        createdAt: new Date(welcomeMessage.createdAt),
        isWelcome: true, // Special flag for welcome modal
      });
    }

    // Get other item delivery messages (items sent by admin)
    itemMessages.filter((m: any) => !m.id.startsWith('welcome_')).forEach((itemMsg: any) => {
      messages.push({
        id: `item-${itemMsg.id}`,
        title: `📦 Item Delivery: ${itemMsg.productName}`,
        content: `Your item has been delivered!\n\n${itemMsg.itemContent}`,
        type: 'delivery',
        transactionId: itemMsg.transactionId,
        isRead: itemMsg.isRead,
        createdAt: new Date(itemMsg.createdAt),
        itemDetails: {
          productName: itemMsg.productName,
          amount: itemMsg.amount,
          cryptocurrency: itemMsg.cryptocurrency,
          status: 'delivered',
        },
      });
    });

    // Get user's transactions to build other messages
    const transactions = await db.getTransactions();
    const userTransactions = transactions.filter(
      (t: any) => t.buyerId === decoded.userId || t.sellerId === decoded.userId
    );

    // Build messages from transactions
    userTransactions.forEach(async (tx: any) => {
      const product = await db.getProduct(tx.productId);
      
      if (tx.buyerId === decoded.userId) {
        // Buyer messages
        if (tx.status === 'deposit_confirmed') {
          messages.push({
            id: `deposit-${tx.id}`,
            title: '✅ Deposit Confirmed!',
            content: `Your deposit of $${tx.amount.toFixed(2)} has been confirmed by our system.\n\nYour balance has been updated.\n\nWaiting for item delivery...`,
            type: 'order',
            transactionId: tx.id,
            isRead: false,
            createdAt: new Date(tx.createdAt),
            itemDetails: {
              productName: product?.name || 'Unknown Product',
              amount: tx.amount,
              cryptocurrency: tx.cryptocurrency,
              walletAddress: tx.walletAddress,
              status: tx.status,
            },
          });
        }

        if (tx.status === 'paid') {
          messages.push({
            id: `paid-${tx.id}`,
            title: '📦 Item Delivered & Payment Confirmed',
            content: `Your payment of $${tx.amount.toFixed(2)} for "${product?.name}" has been confirmed and released to the seller.\n\nThank you for your purchase!`,
            type: 'order',
            transactionId: tx.id,
            isRead: false,
            createdAt: new Date(tx.confirmedAt || tx.createdAt),
            itemDetails: {
              productName: product?.name || 'Unknown Product',
              amount: tx.amount,
              cryptocurrency: tx.cryptocurrency,
              walletAddress: tx.walletAddress,
              status: tx.status,
            },
          });
        }
      }
    });

    // Sort messages by date (newest first)
    messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ messages, success: true });
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { transactionId, buyerId, productName, itemDetails } = body;

    if (!transactionId || !buyerId || !productName || !itemDetails) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the transaction to verify it exists
    const transaction = db.getTransactionById(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Verify this is the correct buyer
    if (transaction.buyerId !== buyerId) {
      return NextResponse.json({ error: 'Invalid buyer for this transaction' }, { status: 403 });
    }

    // Check if item already sent
    const existingItem = db.getInboxItemByTransactionId(transactionId);
    if (existingItem) {
      return NextResponse.json({ error: 'Item already sent to this buyer' }, { status: 400 });
    }

    // Add item to buyer's inbox
    const inboxItem = db.addInboxItem({
      buyerId,
      transactionId,
      productName,
      itemDetails,
      sentAt: new Date().toISOString(),
      confirmed: false,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Item sent to buyer inbox',
      inboxItem 
    });
  } catch (error) {
    console.error('[SEND ITEM] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

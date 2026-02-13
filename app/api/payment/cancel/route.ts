import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('[PAYMENT-CANCEL] POST request received');

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

    const user = await db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let body;
    try {
      const bodyText = await req.text();
      if (!bodyText) {
        return NextResponse.json(
          { error: 'Request body is required' },
          { status: 400 }
        );
      }
      body = JSON.parse(bodyText);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId is required' },
        { status: 400 }
      );
    }

    // Get the transaction
    const transactions = await db.getTransactions();
    const transaction = transactions.find(t => t.id === transactionId);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify the user is the buyer
    if (transaction.buyerId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only cancel your own orders' },
        { status: 403 }
      );
    }

    // Only pending orders can be cancelled
    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${transaction.status}. Only pending orders can be cancelled.` },
        { status: 400 }
      );
    }

    // Update transaction status to cancelled
    const updatedTransaction = { ...transaction, status: 'cancelled' as const };
    await db.updateTransaction(transactionId, updatedTransaction);

    console.log('[PAYMENT-CANCEL] Order cancelled successfully:', transactionId);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Order cancelled successfully',
        transaction: updatedTransaction
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PAYMENT-CANCEL] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

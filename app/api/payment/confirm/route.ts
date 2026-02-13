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

    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    const transaction = db.getTransactionById(transactionId);
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.buyerId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // First step: Admin confirms deposit received
    // Only move from 'pending' to 'deposit_confirmed' 
    // Status transitions:
    // pending -> deposit_confirmed (system confirms deposit received on balance)
    // deposit_confirmed -> paid (buyer confirms release via item delivery)
    // paid -> completed (seller marks as completed)
    
    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: 'Transaction is not in pending status' },
        { status: 400 }
      );
    }

    // Admin/system verifies deposit and updates user balance
    const buyer = db.getUserById(transaction.buyerId);
    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer not found' },
        { status: 404 }
      );
    }

    // Update user balance to reflect deposit
    const updatedBalance = (buyer.balance || 0) + transaction.amount;
    db.updateUser(transaction.buyerId, {
      balance: updatedBalance,
      trustScore: Math.min((buyer.trustScore || 0) + 5, 100),
    });

    // Update transaction status to deposit_confirmed
    db.updateTransaction(transactionId, {
      status: 'deposit_confirmed',
      paymentConfirmedByAdmin: true,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Deposit confirmed. User balance updated. Awaiting buyer confirmation for release.'
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[PAYMENT-CONFIRM] POST error:', error);
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

    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    const transaction = db.getTransactionById(transactionId);
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.buyerId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (transaction.status !== 'deposit_confirmed') {
      return NextResponse.json(
        { error: 'Transaction must be deposit_confirmed first' },
        { status: 400 }
      );
    }

    // Buyer confirms they received item and are ready to release payment
    db.updateTransaction(transactionId, {
      status: 'paid',
      buyerConfirmedRelease: true,
      confirmedAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Delivery confirmed. Payment marked as paid. Escrow can now be released.'
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[PAYMENT-CONFIRM] PUT error:', error);
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


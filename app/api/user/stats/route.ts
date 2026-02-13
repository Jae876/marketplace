import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    const user = await db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    // Calculate current stats
    const completedTransactions = (await db.getTransactions()).filter(
      (t: any) => (t.buyerId === user.id || t.sellerId === user.id) && t.status === 'completed'
    );

    const totalBalance = completedTransactions.reduce((sum: number, t: any) => {
      if (t.buyerId === user.id) {
        return sum + t.amount;
      }
      return sum;
    }, 0);

    // Calculate trust score
    let trustScore = user.trustScore || 0;
    const transactionCount = completedTransactions.length;
    
    if (transactionCount > 0) {
      trustScore = 10; // First transaction bonus
      trustScore += Math.min((transactionCount - 1) * 5, 40); // Additional transactions
      const balancePoints = Math.min(Math.floor(totalBalance / 100), 50);
      trustScore += balancePoints;
      trustScore = Math.min(trustScore, 100);
    }

    // Update user if stats changed
    if (user.balance !== totalBalance || user.trustScore !== trustScore) {
      await db.updateUser(user.id, {
        balance: totalBalance,
        trustScore: trustScore,
      });
    }

    return NextResponse.json({
      balance: totalBalance,
      trustScore: trustScore,
      completedTransactions: transactionCount,
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[USER-STATS] Error:', error);
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


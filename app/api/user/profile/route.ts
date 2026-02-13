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

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate balance from completed transactions
    const balance = db.getUserBalance(decoded.userId);
    
    // Get recent deposits (completed transactions in last 24 hours)
    const recentDeposits = db.getRecentDeposits(decoded.userId, 24);
    
    // Calculate trust score based on completed transactions
    const completedTransactions = db.getUserTransactions(decoded.userId)
      .filter(t => t.status === 'completed' && t.buyerId === decoded.userId);
    
    let trustScore = 0;
    if (completedTransactions.length > 0) {
      trustScore += 10; // First transaction bonus
      trustScore += Math.min((completedTransactions.length - 1) * 5, 40); // Additional transactions
      trustScore += Math.min(Math.floor(balance / 100), 50); // $100 = 1 point
      trustScore = Math.min(trustScore, 100); // Cap at 100
    }

    // Return user without sensitive data, with calculated balance
    const { password, securityPhrase, ...userData } = user;
    const userWithStats = {
      ...userData,
      balance: balance,
      trustScore: trustScore,
      recentDeposits: recentDeposits,
    };

    return NextResponse.json({ user: userWithStats }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('Profile GET error:', error);
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

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { firstName, lastName, username, email } = body;

    // Check if username is taken by another user
    if (username && username !== user.username) {
      const existingUser = db.getUserByUsername(username);
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        );
      }
    }

    // Check if email is taken by another user
    if (email && email !== user.email) {
      const existingUser = db.getUserByEmail(email);
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'Email already taken' },
          { status: 400 }
        );
      }
    }

    // Update user using database method
    const success = db.updateUser(user.id, {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      username: username || user.username,
      email: email || user.email,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    const updatedUser = db.getUserById(user.id);
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    const { password, securityPhrase, ...userData } = updatedUser;

    return NextResponse.json({ user: userData });
  } catch (error: any) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


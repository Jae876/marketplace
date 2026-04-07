import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { convertUsdToCrypto, getCryptoById } from '@/lib/crypto';

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

    const { cryptocurrency, amountUsd } = await req.json();

    if (!cryptocurrency || !amountUsd) {
      return NextResponse.json(
        { error: 'Missing required fields: cryptocurrency, amountUsd' },
        { status: 400 }
      );
    }

    // Validate amount
    const amount = parseFloat(amountUsd);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Set minimum deposit amount ($5)
    if (amount < 5) {
      return NextResponse.json(
        { error: 'Minimum deposit amount is $5 USD' },
        { status: 400 }
      );
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

    // Get crypto details for conversion
    const cryptoInfo = getCryptoById(cryptocurrency);
    const cryptoAmount = convertUsdToCrypto(amount, cryptocurrency);

    // Create deposit transaction (uses system_deposit product for FK constraint)
    const depositId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.createTransaction({
      id: depositId,
      productId: 'system_deposit', // Special system product for all deposits (satisfies FK constraint)
      buyerId: decoded.userId,
      sellerId: decoded.userId, // Deposit to self - buyer is also seller for balance credits
      amount: amount,
      cryptocurrency: cryptocurrency,
      walletAddress: walletAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      depositId,
      walletAddress: walletAddress,
      amountUsd: amount,
      cryptoAmount: cryptoAmount,
      cryptoSymbol: cryptoInfo?.symbol || cryptocurrency.toUpperCase(),
      cryptocurrency,
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[DEPOSIT] Error:', error);
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

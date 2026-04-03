import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ELIGIBLE_BALANCE_THRESHOLD = 10;
const ELIGIBLE_SPEND_THRESHOLD = 10;

// Helper function to check if user is eligible for giveaway
async function isUserEligibleForGiveaway(userId: string): Promise<boolean> {
  try {
    const user = await db.getUser(userId);
    if (!user) return false;

    const userBalance = user.balance ?? 0;
    
    // Check balance threshold
    if (userBalance >= ELIGIBLE_BALANCE_THRESHOLD) {
      console.log(`[PRODUCTS] User ${userId} eligible via balance: $${userBalance}`);
      return true;
    }

    // Check purchase history (total spent)
    try {
      const userTransactions = await db.getTransactionsByUser(userId);
      const totalSpent = userTransactions
        .filter((t: any) => t.status === 'completed' && t.buyerId === userId)
        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      
      if (totalSpent >= ELIGIBLE_SPEND_THRESHOLD) {
        console.log(`[PRODUCTS] User ${userId} eligible via spend: $${totalSpent}`);
        return true;
      }
    } catch (spendError) {
      console.log(`[PRODUCTS] Could not check spend history for user ${userId}`);
    }

    return false;
  } catch (error: any) {
    console.error(`[PRODUCTS] Error checking giveaway eligibility for user ${userId}:`, error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('[PRODUCTS] GET request received');
    
    const { region, type, search } = Object.fromEntries(
      new URL(req.url).searchParams
    );

    let products = await db.getAllProducts();
    console.log('[PRODUCTS] Total products from database:', products.length);

    // Check if there's an active giveaway
    const activeGiveaway = await db.getActiveGiveaway();
    let userIsEligibleForGiveaway = false;

    if (activeGiveaway) {
      console.log('[PRODUCTS] Active giveaway detected, discount: $' + activeGiveaway.discount);
      
      // Check if user is authenticated and eligible
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const decoded = verifyToken(token);
        
        if (decoded?.userId) {
          userIsEligibleForGiveaway = await isUserEligibleForGiveaway(decoded.userId);
          console.log(`[PRODUCTS] User ${decoded.userId} giveaway eligible: ${userIsEligibleForGiveaway}`);
        }
      }

      // Apply discount only to eligible users
      if (userIsEligibleForGiveaway) {
        console.log('[PRODUCTS] Applying $' + activeGiveaway.discount + ' discount to eligible user');
        products = products.map((p: any) => ({
          ...p,
          price: Math.max(0, parseFloat(p.price) - activeGiveaway.discount),
          originalPrice: p.price,
          giveawayDiscount: activeGiveaway.discount,
          giveawayActive: true,
        }));
      } else {
        // Non-eligible users see original prices but know giveaway is active
        console.log('[PRODUCTS] User not eligible for giveaway, showing original prices');
        products = products.map((p: any) => ({
          ...p,
          price: parseFloat(p.price),
          giveawayActive: true,
          giveawayEligible: false,
        }));
      }
    }

    // Filter out system_deposit product (internal only)
    products = products.filter((p: any) => p.id !== 'system_deposit');

    // Filter by region
    if (region) {
      products = products.filter((p: any) => 
        p.region.toLowerCase().includes(region.toLowerCase())
      );
    }

    // Filter by type
    if (type) {
      products = products.filter((p: any) => 
        p.type.toLowerCase().includes(type.toLowerCase())
      );
    }

    // Search by name/description
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((p: any) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    console.log('[PRODUCTS] Returning products:', products.length);
    return NextResponse.json({ products }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('[PRODUCTS] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', products: [] },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}


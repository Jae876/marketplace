import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GIVEAWAY_DISCOUNT = 10;
const GIVEAWAY_DURATION_HOURS = 24;
const ELIGIBLE_BALANCE_THRESHOLD = 10;
const ELIGIBLE_SPEND_THRESHOLD = 10;

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await req.json();

    if (action === 'start') {
      return await startGiveaway();
    } else if (action === 'cancel') {
      return await cancelGiveaway();
    } else if (action === 'status') {
      return await getGiveawayStatus();
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[GIVEAWAY] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to check if user is eligible
async function isUserEligible(userId: string, userBalance: number): Promise<boolean> {
  // Check balance threshold
  if (userBalance >= ELIGIBLE_BALANCE_THRESHOLD) {
    return true;
  }

  // Check purchase history (total spent)
  try {
    const userTransactions = await db.getTransactionsByUser(userId);
    const totalSpent = userTransactions
      .filter((t: any) => t.status === 'completed' && t.buyerId === userId)
      .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    
    console.log(`[GIVEAWAY] User ${userId} - Balance: $${userBalance}, Total Spent: $${totalSpent}`);
    return totalSpent >= ELIGIBLE_SPEND_THRESHOLD;
  } catch (error: any) {
    console.error(`[GIVEAWAY] Error checking spend history for user ${userId}:`, error);
    return false;
  }
}

async function startGiveaway() {
  try {
    console.log('[GIVEAWAY] Starting giveaway...');

    const allUsers = await db.getAllUsers();
    console.log(`[GIVEAWAY] Retrieved ${allUsers.length} users from database`);

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No users found in system',
        count: 0,
      });
    }

    const giveawayId = `giveaway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[GIVEAWAY] Creating giveaway record: ${giveawayId}`);
    await db.startGiveaway(giveawayId, GIVEAWAY_DISCOUNT, GIVEAWAY_DURATION_HOURS);
    console.log(`[GIVEAWAY] Giveaway record created successfully`);

    let notificationCount = 0;
    let eligibleCount = 0;
    const errors: string[] = [];

    console.log(`[GIVEAWAY] Starting notification loop for ${allUsers.length} users`);

    for (const user of allUsers) {
      try {
        console.log(`[GIVEAWAY] Processing user: ${user.id}`);
        
        if (!user.id) {
          console.warn('[GIVEAWAY] User has no ID, skipping');
          errors.push('User with no ID');
          continue;
        }

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userBalance = user.balance ?? 0;
        
        // Check eligibility
        let isEligible = false;
        try {
          isEligible = await isUserEligible(user.id, userBalance);
        } catch (eligError: any) {
          console.warn(`[GIVEAWAY] Error checking eligibility for ${user.id}:`, eligError.message);
          isEligible = false;
        }
        
        if (isEligible) eligibleCount++;
        console.log(`[GIVEAWAY] User ${user.id} - Balance: $${userBalance}, Eligible: ${isEligible}`);

        const userMessage = generateGiveawayMessage(isEligible, userBalance);
        console.log(`[GIVEAWAY] Generated message for user ${user.id} (${userMessage.length} chars)`);

        const messageObject = {
          id: messageId,
          transactionId: 'system_giveaway',
          buyerId: user.id,
          sellerId: 'SYSTEM',
          productName: 'Special Giveaway Alert',
          itemContent: userMessage,
          amount: isEligible ? GIVEAWAY_DISCOUNT : 0,
          cryptocurrency: 'USD',
          isRead: false,
          isWelcome: false,
          createdAt: new Date().toISOString(),
        };

        console.log(`[GIVEAWAY] Creating message object:`, {
          id: messageId,
          buyerId: user.id,
          eligible: isEligible,
          msgLength: userMessage.length,
        });

        await db.createItemMessage(messageObject);
        
        notificationCount++;
        console.log(`[GIVEAWAY] Message successfully created and stored for user ${user.id}`);
      } catch (userError: any) {
        const errorMsg = `User ${user.id}: ${userError.message || String(userError)}`;
        errors.push(errorMsg);
        console.error(`[GIVEAWAY] FAILED to notify user ${user.id}:`, userError);
      }
    }

    console.log(`[GIVEAWAY] Giveaway complete. Notified: ${notificationCount}/${allUsers.length}, Eligible: ${eligibleCount}`);

    return NextResponse.json({
      success: notificationCount > 0,
      message: `Giveaway LIVE! Messaged ${notificationCount}/${allUsers.length} users. ${eligibleCount} eligible for $${GIVEAWAY_DISCOUNT} discount.`,
      count: notificationCount,
      total: allUsers.length,
      eligibleCount: eligibleCount,
      giveawayId: giveawayId,
      discount: GIVEAWAY_DISCOUNT,
      duration: GIVEAWAY_DURATION_HOURS,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[GIVEAWAY] CRITICAL Error starting giveaway:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start giveaway' },
      { status: 500 }
    );
  }
}

async function cancelGiveaway() {
  try {
    console.log('[GIVEAWAY] Canceling giveaway...');

    const activeGiveaway = await db.getActiveGiveaway();
    
    if (!activeGiveaway) {
      return NextResponse.json({
        success: false,
        message: 'No active giveaway to cancel',
      });
    }

    await db.endGiveaway(activeGiveaway.id);

    console.log('[GIVEAWAY] Giveaway canceled, prices reset to normal');

    return NextResponse.json({
      success: true,
      message: 'Giveaway canceled! All product prices reset to normal.',
      giveawayId: activeGiveaway.id,
    });
  } catch (error: any) {
    console.error('[GIVEAWAY] Error canceling giveaway:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel giveaway' },
      { status: 500 }
    );
  }
}

async function getGiveawayStatus() {
  try {
    const activeGiveaway = await db.getActiveGiveaway();
    return NextResponse.json({
      active: !!activeGiveaway,
      giveaway: activeGiveaway || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}

function generateGiveawayMessage(isEligible: boolean, userBalance: number): string {
  const endTime = new Date(Date.now() + GIVEAWAY_DURATION_HOURS * 60 * 60 * 1000);
  const formattedTime = endTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });

  if (isEligible) {
    return `SPECIAL GIVEAWAY ALERT - EXCLUSIVE ACCESS

Congratulations! You are eligible for our 24-hour Flash Giveaway!

DISCOUNT: $10 OFF all marketplace products
DURATION: 24 hours (ends ${formattedTime} EST)
STATUS: YOU ARE ELIGIBLE
CURRENT BALANCE: $${userBalance}

Your eligibility qualifies you for an exclusive $10 discount on all products!

How to claim:
1. Visit Marketplace
2. Browse products
3. Add to cart - $10 discount applied automatically
4. Complete payment

Terms:
- Discount applies to all eligible products
- One discount per account during promotion
- Automatic price reduction at checkout

Expires: ${formattedTime} EST`;
  } else {
    return `SPECIAL GIVEAWAY ALERT

We're hosting a 24-hour Flash Giveaway - Join eligible members!

DISCOUNT: $10 OFF all marketplace products
DURATION: 24 hours (ends ${formattedTime} EST)
REQUIREMENT: Minimum balance of $${ELIGIBLE_BALANCE_THRESHOLD} OR $${ELIGIBLE_SPEND_THRESHOLD}+ in purchases
YOUR CURRENT BALANCE: $${userBalance}

To get instant access to the $10 discount, become eligible by:

Option 1: Add Funds
- Deposit to reach $${ELIGIBLE_BALANCE_THRESHOLD}+ balance
- Instant access once threshold reached

Option 2: Purchase History
- Spend $${ELIGIBLE_SPEND_THRESHOLD}+ on marketplace products
- Already qualified? Discount applies automatically

Once qualified:
1. Visit Marketplace
2. Browse products
3. Add to cart - $10 discount applied automatically
4. Complete payment

Don't miss out! Offer expires: ${formattedTime} EST`;
  }
}

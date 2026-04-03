import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GIVEAWAY_DISCOUNT = 10;
const GIVEAWAY_DURATION_HOURS = 24;
const ELIGIBLE_BALANCE_THRESHOLD = 10;

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

    let notificationCount = 0;
    let eligibleCount = 0;
    const errors: string[] = [];

    console.log(`[GIVEAWAY] Starting notification loop for ${allUsers.length} users`);

    for (const user of allUsers) {
      try {
        if (!user.id) {
          console.warn('[GIVEAWAY] Skipping user with no ID');
          continue;
        }

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userBalance = user.balance ?? 0;
        const isEligible = userBalance >= ELIGIBLE_BALANCE_THRESHOLD;
        if (isEligible) eligibleCount++;

        const userMessage = generateGiveawayMessage(isEligible);

        console.log(`[GIVEAWAY] Creating message for user ${user.id}`);

        await db.createItemMessage({
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
        });

        notificationCount++;
        console.log(`[GIVEAWAY] Message sent to user ${user.id}`);
      } catch (userError: any) {
        const errorMsg = `User ${user.id}: ${userError.message}`;
        errors.push(errorMsg);
        console.error(`[GIVEAWAY] ${errorMsg}`);
      }
    }

    console.log(`[GIVEAWAY] Giveaway started. Notified: ${notificationCount}, Eligible: ${eligibleCount}`);

    return NextResponse.json({
      success: true,
      message: `Giveaway LIVE! Messaging ${notificationCount}/${allUsers.length} users. ${eligibleCount} eligible for $${GIVEAWAY_DISCOUNT} discount.`,
      count: notificationCount,
      total: allUsers.length,
      eligibleCount: eligibleCount,
      giveawayId: giveawayId,
      discount: GIVEAWAY_DISCOUNT,
      duration: GIVEAWAY_DURATION_HOURS,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[GIVEAWAY] Error starting giveaway:', error);
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

function generateGiveawayMessage(isEligible: boolean): string {
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
    return `SPECIAL GIVEAWAY ALERT

You are eligible for our exclusive 24-hour Flash Giveaway!

DISCOUNT: $10 OFF all marketplace products
DURATION: 24 hours (ends ${formattedTime} EST)
STATUS: YOU ARE ELIGIBLE

How to claim:
1. Visit Marketplace
2. Browse products
3. Add to cart - discount applied automatically
4. Complete payment

Expires: ${formattedTime} EST`;
  } else {
    return `SPECIAL GIVEAWAY ALERT

We're hosting a 24-hour Flash Giveaway!

DISCOUNT: $10 OFF all marketplace products
DURATION: 24 hours (ends ${formattedTime} EST)
REQUIREMENT: Minimum balance of $${ELIGIBLE_BALANCE_THRESHOLD}

How to qualify:
Add funds to your account to reach $${ELIGIBLE_BALANCE_THRESHOLD} balance and get instant access to the $10 discount!

Once qualified:
1. Visit Marketplace
2. Browse products
3. Add to cart - discount applied automatically
4. Complete payment

Expires: ${formattedTime} EST`;
  }
}

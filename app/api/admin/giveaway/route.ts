import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GIVEAWAY_DISCOUNT = 10; // $10 off all products
const GIVEAWAY_DURATION_HOURS = 24;
const ELIGIBLE_BALANCE_THRESHOLD = 10; // Min $10 balance to be eligible

export async function POST(req: NextRequest) {
  try {
    // Verify admin session
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or missing admin session' },
        { status: 401 }
      );
    }

    const { action } = await req.json();

    if (action === 'start') {
      return await startGiveaway();
    } else if (action === 'status') {
      return await getGiveawayStatus();
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
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
    console.log('[GIVEAWAY] Starting giveaway broadcast...');

    // Get all users (both eligible and ineligible for notification)
    const allUsers = await db.getAllUsers();

    console.log(`[GIVEAWAY] Notifying ${allUsers.length} total users`);

    if (allUsers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No users found in system',
        count: 0,
      });
    }

    // Generate giveaway ID
    const giveawayId = `giveaway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store giveaway state in database
    await db.startGiveaway(giveawayId, GIVEAWAY_DISCOUNT, GIVEAWAY_DURATION_HOURS);

    // Send notification to each user's inbox (regardless of eligibility)
    let notificationCount = 0;
    let eligibleCount = 0;
    const errors: string[] = [];

    for (const user of allUsers) {
      try {
        const messageId = `giveaway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const isEligible = parseFloat(user.balance) >= ELIGIBLE_BALANCE_THRESHOLD;
        if (isEligible) eligibleCount++;

        // Generate message tailored to user's eligibility status
        const userMessage = generateGiveawayMessage(isEligible);

        // Create message in user's inbox
        await db.createItemMessage({
          id: messageId,
          transactionId: 'system_giveaway',
          buyerId: user.id,
          sellerId: 'admin',
          productName: '🎁 Special Giveaway - 24 Hour Flash Sale',
          itemContent: userMessage,
          amount: isEligible ? GIVEAWAY_DISCOUNT : 0,
          cryptocurrency: 'USD',
          isRead: false,
          isWelcome: false,
          createdAt: new Date().toISOString(),
        });

        notificationCount++;
        console.log(`[GIVEAWAY] Notification sent to user ${user.id} (eligible: ${isEligible})`);
      } catch (userError: any) {
        errors.push(`User ${user.id}: ${userError.message}`);
        console.error(`[GIVEAWAY] Failed to notify user ${user.id}:`, userError);
      }
    }

    console.log('[GIVEAWAY] Giveaway started successfully', {
      giveawayId,
      discount: GIVEAWAY_DISCOUNT,
      duration: GIVEAWAY_DURATION_HOURS,
      totalNotified: notificationCount,
      eligibleCount: eligibleCount,
    });

    return NextResponse.json({
      success: true,
      message: `✓ Giveaway LIVE! Notified ${notificationCount} users. ${eligibleCount} are eligible. $${GIVEAWAY_DISCOUNT} discount active for ${GIVEAWAY_DURATION_HOURS} hours.`,
      count: notificationCount,
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

async function getGiveawayStatus() {
  try {
    return NextResponse.json({
      active: false,
      message: 'No active giveaway',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get giveaway status' },
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
    return `
SPECIAL GIVEAWAY ALERT

Dear Valued Member,

We're thrilled to announce an exclusive 24-hour Flash Giveaway
exclusively for our premium members!

GIVEAWAY DETAILS:

✓ DISCOUNT:      $10 OFF all marketplace products
✓ DURATION:      24 hours (ends ${formattedTime} EST)
✓ ELIGIBILITY:   YOU ARE ELIGIBLE ✓
✓ LIMITATION:    One discount per account

HOW TO CLAIM:

1. Visit the Marketplace
2. Browse available products
3. Add to cart - $10 discount applied automatically
4. Complete payment

Don't miss this limited-time opportunity!

Best regards,
Marketplace Admin`;
  } else {
    return `
SPECIAL GIVEAWAY ALERT

Dear Member,

We're excited to announce a 24-hour Flash Giveaway for eligible
users on our platform!

GIVEAWAY DETAILS:

✓ DISCOUNT:      $10 OFF all marketplace products
✓ DURATION:      24 hours (ends ${formattedTime} EST)
✓ ELIGIBILITY:   Requires minimum balance of $${ELIGIBLE_BALANCE_THRESHOLD}
✓ LIMITATION:    One discount per eligible account

HOW TO BECOME ELIGIBLE:

To qualify for this giveaway, you need a balance of at least
$${ELIGIBLE_BALANCE_THRESHOLD}. Simply add funds to your account via
our Add Funds feature, and you'll instantly become eligible!

Once eligible:
1. Visit the Marketplace
2. Browse available products
3. Add to cart - $10 discount applied automatically
4. Complete payment

Don't miss this opportunity to save on your next purchase!

Best regards,
Marketplace Admin`;
  }
}

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

    // Get all users with balance >= $10 (eligible users)
    const users = await db.getAllUsers();
    const eligibleUsers = users.filter((u: any) => parseFloat(u.balance) >= ELIGIBLE_BALANCE_THRESHOLD);

    console.log(`[GIVEAWAY] Found ${eligibleUsers.length} eligible users out of ${users.length}`);

    if (eligibleUsers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No eligible users found (minimum balance: $10)',
        count: 0,
      });
    }

    // Prepare professional giveaway notification
    const giveawayMessage = generateGiveawayMessage();

    // Send notification to each eligible user's inbox
    let notificationCount = 0;
    const errors: string[] = [];

    for (const user of eligibleUsers) {
      try {
        const messageId = `giveaway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create welcome message for user inbox
        await db.createItemMessage({
          id: messageId,
          transactionId: 'system_giveaway',
          buyerId: user.id,
          sellerId: 'admin',
          productName: '🎁 Special Giveaway - 24 Hour Flash Sale',
          itemContent: giveawayMessage,
          amount: GIVEAWAY_DISCOUNT,
          cryptocurrency: 'USD',
          isRead: false,
          isWelcome: false,
          createdAt: new Date().toISOString(),
        });

        notificationCount++;
        console.log(`[GIVEAWAY] Notification sent to user ${user.id}`);
      } catch (userError: any) {
        errors.push(`User ${user.id}: ${userError.message}`);
        console.error(`[GIVEAWAY] Failed to notify user ${user.id}:`, userError);
      }
    }

    // Store giveaway state (will be used for discount application)
    const giveawayState = {
      id: `giveaway_${Date.now()}`,
      active: true,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + GIVEAWAY_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
      discount: GIVEAWAY_DISCOUNT,
      eligibleUsers: eligibleUsers.map((u: any) => u.id),
      notifiedUsers: notificationCount,
    };

    console.log('[GIVEAWAY] Giveaway started successfully', giveawayState);

    return NextResponse.json({
      success: true,
      message: `Giveaway started! Notified ${notificationCount} eligible users.`,
      count: notificationCount,
      giveawayId: giveawayState.id,
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
    // In production, store giveaway state in DB or cache
    // For now, return template response
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

function generateGiveawayMessage(): string {
  const endTime = new Date(Date.now() + GIVEAWAY_DURATION_HOURS * 60 * 60 * 1000);
  const formattedTime = endTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });

  return `
╔════════════════════════════════════════════════════════════╗
║                   🎁 SPECIAL GIVEAWAY ALERT 🎁             ║
╚════════════════════════════════════════════════════════════╝

Dear Valued Member,

We're thrilled to announce an exclusive 24-hour Flash Giveaway 
exclusively for our premium members!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 GIVEAWAY DETAILS:

✓ DISCOUNT:      $10 OFF all marketplace products
✓ DURATION:      24 hours (ends ${formattedTime} EST)
✓ ELIGIBILITY:   Available to all users with balance ≥ $10
✓ LIMITATION:    One discount per eligible account

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 HOW IT WORKS:

1. Browse our exclusive marketplace products
2. The $10 giveaway discount applies automatically at checkout
3. Complete your purchase with confirmed crypto transfer
4. Your item delivers instantly upon confirmation

Note: The discount applies to product prices only and cannot be 
combined with other promotional offers. One per account during 
the promotional period.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ TIME REMAINING: 24 hours from giveaway start
📍 TIMEZONE: Eastern Time (EST/EDT)

Thank you for being part of our exclusive marketplace community.
Enjoy your discount!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Contact our support team.

Best regards,
Admin Team
Russian Roulette Marketplace
`.trim();
}

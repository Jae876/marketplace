import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/user/referrals
 * Fetch referral information for authenticated user
 * Returns:
 * - referralCode: User's unique referral code
 * - referralInfo: List of users they referred and their status
 * - referrer: Who referred this user
 * - totalReferred: Count of referrals
 * - totalQualified: Count of qualified referrals ($10+)
 * - pendingRewards: Count of referrals eligible for $2 reward
 */
export async function GET(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract token (in real app, you'd verify JWT)
    const token = authHeader.substring(7);
    
    // Get userId from request (assuming it's passed via custom header or we need to decode JWT)
    const userIdHeader = req.headers.get('x-user-id');
    if (!userIdHeader) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const userId = userIdHeader as string;

    // Get user to fetch referral code
    const user = await db.getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get referral information
    const referralInfo = await db.getReferralInfo(userId);

    const totalReferred = referralInfo.referrals.length;
    const totalQualified = referralInfo.referrals.filter((r: any) => r.isQualified).length;
    const pendingRewards = referralInfo.referrals.filter((r: any) => r.rewardEligible).length;
    const totalRewardsEarned = totalQualified * 2; // $2 per qualified
    const totalRewardsPending = pendingRewards * 2;

    return NextResponse.json({
      success: true,
      referralCode: (user as any).referralCode,
      referrals: referralInfo.referrals,
      referrer: referralInfo.referrer,
      stats: {
        totalReferred,
        totalQualified,
        pendingRewards,
        totalRewardsEarned,
        totalRewardsPending,
      },
    });
  } catch (error: any) {
    console.error('[REFERRAL API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral information' },
      { status: 500 }
    );
  }
}

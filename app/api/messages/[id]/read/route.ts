import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;

    // If it's a prefixed message, extract actual ID and mark as read
    if (messageId.startsWith('item-')) {
      const actualId = messageId.substring(5); // Remove 'item-' prefix
      console.log('[READ] Marking item message as read:', actualId);
      await db.markItemMessageAsRead(actualId);
      return NextResponse.json({ success: true });
    }

    if (messageId.startsWith('welcome-')) {
      const actualId = messageId.substring(8); // Remove 'welcome-' prefix
      console.log('[READ] Marking welcome message as read:', actualId);
      await db.markItemMessageAsRead(actualId);
      return NextResponse.json({ success: true });
    }

    // For other prefixed message types (deposit-, paid-, etc), extract and handle
    if (messageId.includes('-')) {
      const lastDash = messageId.lastIndexOf('-');
      const actualId = messageId.substring(lastDash + 1);
      console.log('[READ] Marking message as read:', actualId);
      // For transaction-based messages, marking read doesn't need database update
      // They're transient notifications
      return NextResponse.json({ success: true });
    }

    // For unprefixed messages, just acknowledge
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

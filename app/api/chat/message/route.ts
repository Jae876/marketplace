import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const user = db.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get Telegram bot token from environment
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (telegramBotToken && telegramChatId) {
      // Send message to Telegram bot for admin review
      const telegramMessage = `
📧 New Support Message from ${user.username}

User: ${user.firstName} ${user.lastName}
Email: ${user.email}
User ID: ${user.id}

Message:
${message}

---
Timestamp: ${new Date().toISOString()}
      `;

      try {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramMessage,
            parse_mode: 'HTML',
          }),
        });
      } catch (telegramError) {
        console.error('Error sending to Telegram:', telegramError);
        // Continue even if Telegram fails
      }
    }

    // Return bot reply
    const reply =
      'Thanks for your message! 📨 Your complaint has been logged and our team will review it shortly. For urgent issues, please reach out directly through our contact channels. We appreciate your patience!';

    return NextResponse.json({ reply, success: true });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

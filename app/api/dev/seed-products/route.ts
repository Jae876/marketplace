import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateId(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Seed database with real products from theowlet.store
 * These are added as INTERNAL products so they work with existing admin flow
 * Can be edited/modified through the admin panel just like any other product
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[SEED] Seeding products from theowlet.store categories');

    const products = [
      // Discord Category - Converted from NGN at rate 1 USD = 1,550 NGN
      { name: 'Discord Account - Basic', description: 'Fresh Discord account', price: 5.48, region: 'Worldwide', type: 'Discord Account', size: '1 account' },
      { name: 'Discord Account - Aged', description: 'Aged Discord account 6+ months', price: 8.06, region: 'Worldwide', type: 'Discord Account', size: '1 account' },
      { name: 'Discord Account - Verified', description: 'Verified Discord account', price: 9.68, region: 'Worldwide', type: 'Discord Account', size: '1 account' },
      
      // Discord Bulk
      { name: 'Discord Accounts x5', description: '5 Discord accounts bundle', price: 22.58, region: 'Worldwide', type: 'Discord Accounts', size: '5 accounts' },
      { name: 'Discord Accounts x10', description: '10 Discord accounts bundle', price: 41.94, region: 'Worldwide', type: 'Discord Accounts', size: '10 accounts' },
      
      // Facebook Products
      { name: 'Facebook Account - New', description: 'New Facebook account', price: 3.55, region: 'Worldwide', type: 'Facebook Account', size: '1 account' },
      { name: 'Facebook Account - Aged', description: 'Aged Facebook account 50+ friends', price: 8.32, region: 'Worldwide', type: 'Facebook Account', size: '1 account' },
      { name: 'Facebook Account - Asian', description: 'Facebook account from Asia', price: 3.16, region: 'Asia', type: 'Facebook Account', size: '1 account' },
      { name: 'Facebook Clone Account', description: 'Cheap Facebook clone account', price: 1.87, region: 'Worldwide', type: 'Facebook Account', size: '1 account' },
      { name: 'Facebook Countries Bundle', description: 'Facebook accounts from various countries', price: 11.94, region: 'Worldwide', type: 'Facebook Account', size: 'Multiple' },
      
      // Dating Accounts
      { name: 'Facebook Dating Account', description: 'Facebook dating profile setup', price: 4.19, region: 'Worldwide', type: 'Dating Account', size: '1 account' },
      { name: 'Facebook Dating - Premium', description: 'Premium dating account access', price: 11.94, region: 'Worldwide', type: 'Dating Account', size: 'Premium' },
      
      // Gmail & Email
      { name: 'Gmail Account - Standard', description: 'Standard Gmail account', price: 2.26, region: 'Worldwide', type: 'Gmail Account', size: '1 account' },
      { name: 'Gmail Account - Aged 6M', description: 'Gmail account 6 months old', price: 3.55, region: 'Worldwide', type: 'Gmail Account', size: '1 account' },
      { name: 'Gmail Accounts x10', description: '10 Gmail accounts bundle', price: 18.06, region: 'Worldwide', type: 'Gmail Account', size: '10 accounts' },
      { name: 'Yahoo Email Access', description: 'Yahoo email account access', price: 2.26, region: 'Worldwide', type: 'Email Account', size: '1 account' },
      
      // Chat GPT Access
      { name: 'ChatGPT Plus 1 Month', description: 'ChatGPT Plus 1 month subscription', price: 10.30, region: 'Worldwide', type: 'ChatGPT Account', size: '1 month' },
      { name: 'ChatGPT Plus 3 Months', description: 'ChatGPT Plus 3 months subscription', price: 27.29, region: 'Worldwide', type: 'ChatGPT Account', size: '3 months' },
      { name: 'ChatGPT Plus 6 Months', description: 'ChatGPT Plus 6 months subscription', price: 51.10, region: 'Worldwide', type: 'ChatGPT Account', size: '6 months' },
      { name: 'ChatGPT Premium Plus', description: 'ChatGPT Premium Plus access', price: 3.81, region: 'Worldwide', type: 'ChatGPT Account', size: 'Premium' },
      
      // TikTok Followers
      { name: 'TikTok 10K Followers', description: 'TikTok account with 10K followers', price: 43.50, region: 'Worldwide', type: 'TikTok Account', size: '10K followers' },
      { name: 'TikTok 50K Followers', description: 'TikTok account with 50K followers', price: 161.29, region: 'Worldwide', type: 'TikTok Account', size: '50K followers' },
      { name: 'TikTok 100K Followers', description: 'TikTok account with 100K followers', price: 290.32, region: 'Worldwide', type: 'TikTok Account', size: '100K followers' },
      
      // Video/Design Tools
      { name: 'CapCut Pro - Lifetime', description: 'CapCut Pro lifetime license', price: 3.16, region: 'Worldwide', type: 'Software', size: 'Lifetime' },
      { name: 'CapCut Private Account', description: 'CapCut Pro private account', price: 3.16, region: 'Worldwide', type: 'Software', size: 'Private' },
      { name: 'Adobe Creative Suite', description: 'Adobe Creative Cloud access', price: 15.81, region: 'Worldwide', type: 'Software', size: '1 year' },
      
      // Reddit Accounts
      { name: 'Reddit Account - New', description: 'New Reddit account', price: 2.71, region: 'Worldwide', type: 'Reddit Account', size: '1 account' },
      { name: 'Reddit Account - Aged', description: 'Aged Reddit account', price: 4.19, region: 'Worldwide', type: 'Reddit Account', size: '1 account' },
      { name: 'Reddit Account - Premium', description: 'Reddit Premium subscription', price: 8.06, region: 'Worldwide', type: 'Reddit Account', size: 'Premium' },
      
      // YouTube Accounts
      { name: 'YouTube Channel - Beginner', description: 'YouTube channel setup', price: 3.55, region: 'Worldwide', type: 'YouTube Account', size: '1 account' },
      { name: 'YouTube Channel - 1K Subs', description: 'YouTube channel with 1K subscribers', price: 29.03, region: 'Worldwide', type: 'YouTube Channel', size: '1K subs' },
      { name: 'YouTube Channel - 10K Subs', description: 'YouTube channel with 10K subscribers', price: 116.13, region: 'Worldwide', type: 'YouTube Channel', size: '10K subs' },
      
      // Instagram Accounts
      { name: 'Instagram Account - New', description: 'New Instagram account', price: 4.19, region: 'Worldwide', type: 'Instagram Account', size: '1 account' },
      { name: 'Instagram Account - Aged', description: 'Aged Instagram account', price: 6.13, region: 'Worldwide', type: 'Instagram Account', size: '1 account' },
      { name: 'Instagram Followers - 10K', description: '10K Instagram followers', price: 22.58, region: 'Worldwide', type: 'Instagram Followers', size: '10K followers' },
      
      // Twitter Accounts
      { name: 'Twitter Account - New', description: 'New Twitter/X account', price: 2.90, region: 'Worldwide', type: 'Twitter Account', size: '1 account' },
      { name: 'Twitter Account - Aged', description: 'Aged Twitter account', price: 4.52, region: 'Worldwide', type: 'Twitter Account', size: '1 account' },
      { name: 'Twitter Followers - 50K', description: '50K Twitter followers', price: 80.65, region: 'Worldwide', type: 'Twitter Followers', size: '50K followers' },
      
      // LinkedIn Accounts
      { name: 'LinkedIn Account - Personal', description: 'LinkedIn personal account', price: 5.48, region: 'Worldwide', type: 'LinkedIn Account', size: '1 account' },
      { name: 'LinkedIn Account - Business', description: 'LinkedIn business account', price: 9.68, region: 'Worldwide', type: 'LinkedIn Account', size: '1 account' },
      { name: 'LinkedIn Premium Account', description: 'LinkedIn premium subscription', price: 14.19, region: 'Worldwide', type: 'LinkedIn Account', size: 'Premium' },
      
      // Streaming Services
      { name: 'Netflix Premium', description: 'Netflix premium with 4K', price: 11.94, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      { name: 'Disney+ Access', description: 'Disney Plus subscription', price: 7.74, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      { name: 'HBO Max Account', description: 'HBO Max streaming account', price: 9.35, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      { name: 'Hulu Premium', description: 'Hulu premium account', price: 8.71, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      
      // Spotify & Music
      { name: 'Spotify Premium Account', description: 'Spotify premium subscription', price: 8.06, region: 'Worldwide', type: 'Music', size: '1 month' },
      { name: 'Apple Music Account', description: 'Apple Music subscription', price: 6.13, region: 'Worldwide', type: 'Music', size: '1 month' },
      
      // Crypto & Financial
      { name: 'Binance Account - Verified', description: 'Verified Binance crypto exchange account', price: 22.58, region: 'Worldwide', type: 'Crypto Exchange', size: '1 account' },
      { name: 'Coinbase Account - Verified', description: 'Verified Coinbase account', price: 20.65, region: 'Worldwide', type: 'Crypto Exchange', size: '1 account' },
      { name: 'PayPal Account - Verified', description: 'Verified PayPal account', price: 11.94, region: 'Worldwide', type: 'Payment', size: '1 account' },
      { name: 'Stripe Account - Setup', description: 'Stripe payment account setup', price: 14.19, region: 'Worldwide', type: 'Payment', size: '1 account' },
      
      // Snapchat & Telegram
      { name: 'Snapchat Account - New', description: 'New Snapchat account', price: 2.26, region: 'Worldwide', type: 'Snapchat Account', size: '1 account' },
      { name: 'Telegram Account - Verified', description: 'Verified Telegram account', price: 5.48, region: 'Worldwide', type: 'Telegram Account', size: '1 account' },
      { name: 'WhatsApp Business Account', description: 'WhatsApp business verified account', price: 6.13, region: 'Worldwide', type: 'WhatsApp', size: '1 account' },
      
      // Gaming & Other
      { name: 'Xbox Game Pass', description: 'Xbox Game Pass subscription', price: 7.74, region: 'Worldwide', type: 'Gaming', size: '1 month' },
      { name: 'Twitch Channel - Affiliate', description: 'Twitch affiliate channel', price: 29.03, region: 'Worldwide', type: 'Twitch Channel', size: 'Affiliate' },
      { name: 'Discord Server Setup', description: 'Professional Discord server setup', price: 16.13, region: 'Worldwide', type: 'Server Setup', size: 'Full Setup' },
      { name: 'Amazon Prime Account', description: 'Amazon Prime membership', price: 9.68, region: 'Worldwide', type: 'Shopping', size: '1 year' },
      { name: 'Email Bundle - Format UID|PASS|2FA', description: 'Email with credentials in specified format', price: 7.99, region: 'Worldwide', type: 'Email', size: '1 account' },
      
      // TikTok
      { name: 'TikTok Account - Verified', description: 'Verified TikTok account', price: 5.99, region: 'Worldwide', type: 'TikTok Account', size: '1 account' },
      { name: 'TikTok Account - With Followers', description: 'TikTok account with followers', price: 29.99, region: 'Worldwide', type: 'TikTok Account', size: 'With followers' },
      
      // Streaming
      { name: 'Netflix Account - 1 Month', description: '1 month Netflix access', price: 8.99, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      { name: 'Netflix Account - 3 Months', description: '3 months Netflix access', price: 24.99, region: 'Worldwide', type: 'Streaming', size: '3 months' },
      { name: 'Spotify Premium - 1 Month', description: 'Spotify premium monthly', price: 9.99, region: 'Worldwide', type: 'Music', size: '1 month' },
      
      // Gaming
      { name: 'Steam Account - Verified', description: 'Verified Steam account', price: 12.99, region: 'Worldwide', type: 'Gaming', size: '1 account' },
      { name: 'PlayStation Network Account', description: 'PSN account with access', price: 14.99, region: 'Worldwide', type: 'Gaming', size: '1 account' },
      { name: 'Xbox Game Pass - 1 Month', description: 'Xbox Game Pass subscription', price: 11.99, region: 'Worldwide', type: 'Gaming', size: '1 month' },
      
      // Design & Creative
      { name: 'Adobe Creative Cloud - 1 Month', description: 'Adobe CC full access 1 month', price: 19.99, region: 'Worldwide', type: 'Software', size: '1 month' },
      { name: 'Canva Pro - 3 Months', description: 'Canva Pro subscription 3 months', price: 17.99, region: 'Worldwide', type: 'Software', size: '3 months' },
      
      // Dating & Social
      { name: 'Facebook Dating Setup', description: 'Facebook Dating account setup', price: 9.99, region: 'Worldwide', type: 'Dating Account', size: '1 account' },
      { name: 'Tinder Plus - 1 Month', description: 'Tinder Plus monthly', price: 13.99, region: 'Worldwide', type: 'Dating Account', size: '1 month' },
    ];

    let createdCount = 0;

    for (const product of products) {
      try {
        // Create as INTERNAL product so it works with existing admin flow
        const newProduct = {
          id: generateId(),
          name: product.name || 'Unnamed Product',
          description: product.description || '',
          price: product.price || 0,
          region: product.region || 'Worldwide',
          type: product.type || 'Product',
          size: product.size || '',
          image: `https://images.unsplash.com/photo-1516321318423-f06f70d504d0?w=400&h=300&fit=crop&q=80`,
          createdAt: new Date().toISOString()
        };

        await db.createProduct(newProduct);
        createdCount++;
        console.log(`[SEED] Created: ${product.name} - $${product.price}`);
      } catch (error) {
        console.error(`[SEED] Error creating ${product.name}:`, error);
      }
    }

    console.log(`[SEED] Seeded ${createdCount} products successfully`);

    return NextResponse.json({
      message: 'Products seeded successfully from theowlet.store',
      created: createdCount,
      total: products.length,
      note: 'All products added as internal products - editable through admin panel'
    });
  } catch (error: any) {
    console.error('[SEED] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Seeding failed' },
      { status: 500 }
    );
  }
}

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
      // Discord Category
      { name: 'Discord Account - Basic', description: 'Fresh Discord account', price: 8500, region: 'Worldwide', type: 'Discord Account', size: '1 account' },
      { name: 'Discord Account - Aged', description: 'Aged Discord account 6+ months', price: 12500, region: 'Worldwide', type: 'Discord Account', size: '1 account' },
      { name: 'Discord Account - Verified', description: 'Verified Discord account', price: 15000, region: 'Worldwide', type: 'Discord Account', size: '1 account' },
      
      // Discord Bulk
      { name: 'Discord Accounts x5', description: '5 Discord accounts bundle', price: 35000, region: 'Worldwide', type: 'Discord Accounts', size: '5 accounts' },
      { name: 'Discord Accounts x10', description: '10 Discord accounts bundle', price: 65000, region: 'Worldwide', type: 'Discord Accounts', size: '10 accounts' },
      
      // Facebook Products
      { name: 'Facebook Account - New', description: 'New Facebook account', price: 5500, region: 'Worldwide', type: 'Facebook Account', size: '1 account' },
      { name: 'Facebook Account - Aged', description: 'Aged Facebook account 50+ friends', price: 12900, region: 'Worldwide', type: 'Facebook Account', size: '1 account' },
      { name: 'Facebook Account - Asian', description: 'Facebook account from Asia', price: 4900, region: 'Asia', type: 'Facebook Account', size: '1 account' },
      { name: 'Facebook Clone Account', description: 'Cheap Facebook clone account', price: 2900, region: 'Worldwide', type: 'Facebook Account', size: '1 account' },
      { name: 'Facebook Countries Bundle', description: 'Facebook accounts from various countries', price: 18500, region: 'Worldwide', type: 'Facebook Account', size: 'Multiple' },
      
      // Dating Accounts
      { name: 'Facebook Dating Account', description: 'Facebook dating profile setup', price: 6500, region: 'Worldwide', type: 'Dating Account', size: '1 account' },
      { name: 'Facebook Dating - Premium', description: 'Premium dating account access', price: 18500, region: 'Worldwide', type: 'Dating Account', size: 'Premium' },
      
      // Gmail & Email
      { name: 'Gmail Account - Standard', description: 'Standard Gmail account', price: 3500, region: 'Worldwide', type: 'Gmail Account', size: '1 account' },
      { name: 'Gmail Account - Aged 6M', description: 'Gmail account 6 months old', price: 5500, region: 'Worldwide', type: 'Gmail Account', size: '1 account' },
      { name: 'Gmail Accounts x10', description: '10 Gmail accounts bundle', price: 28000, region: 'Worldwide', type: 'Gmail Account', size: '10 accounts' },
      { name: 'Yahoo Email Access', description: 'Yahoo email account access', price: 3500, region: 'Worldwide', type: 'Email Account', size: '1 account' },
      
      // Chat GPT Access
      { name: 'ChatGPT Plus 1 Month', description: 'ChatGPT Plus 1 month subscription', price: 15960, region: 'Worldwide', type: 'ChatGPT Account', size: '1 month' },
      { name: 'ChatGPT Plus 3 Months', description: 'ChatGPT Plus 3 months subscription', price: 42300, region: 'Worldwide', type: 'ChatGPT Account', size: '3 months' },
      { name: 'ChatGPT Plus 6 Months', description: 'ChatGPT Plus 6 months subscription', price: 79200, region: 'Worldwide', type: 'ChatGPT Account', size: '6 months' },
      { name: 'ChatGPT Premium Plus', description: 'ChatGPT Premium Plus access', price: 5900, region: 'Worldwide', type: 'ChatGPT Account', size: 'Premium' },
      
      // TikTok Followers
      { name: 'TikTok 10K Followers', description: 'TikTok account with 10K followers', price: 67420, region: 'Worldwide', type: 'TikTok Account', size: '10K followers' },
      { name: 'TikTok 50K Followers', description: 'TikTok account with 50K followers', price: 250000, region: 'Worldwide', type: 'TikTok Account', size: '50K followers' },
      { name: 'TikTok 100K Followers', description: 'TikTok account with 100K followers', price: 450000, region: 'Worldwide', type: 'TikTok Account', size: '100K followers' },
      
      // Video/Design Tools
      { name: 'CapCut Pro - Lifetime', description: 'CapCut Pro lifetime license', price: 4900, region: 'Worldwide', type: 'Software', size: 'Lifetime' },
      { name: 'CapCut Private Account', description: 'CapCut Pro private account', price: 4900, region: 'Worldwide', type: 'Software', size: 'Private' },
      { name: 'Adobe Creative Suite', description: 'Adobe Creative Cloud access', price: 24500, region: 'Worldwide', type: 'Software', size: '1 year' },
      
      // Reddit Accounts
      { name: 'Reddit Account - New', description: 'New Reddit account', price: 4200, region: 'Worldwide', type: 'Reddit Account', size: '1 account' },
      { name: 'Reddit Account - Aged', description: 'Aged Reddit account', price: 6500, region: 'Worldwide', type: 'Reddit Account', size: '1 account' },
      { name: 'Reddit Account - Premium', description: 'Reddit Premium subscription', price: 12500, region: 'Worldwide', type: 'Reddit Account', size: 'Premium' },
      
      // YouTube Accounts
      { name: 'YouTube Channel - Beginner', description: 'YouTube channel setup', price: 5500, region: 'Worldwide', type: 'YouTube Account', size: '1 account' },
      { name: 'YouTube Channel - 1K Subs', description: 'YouTube channel with 1K subscribers', price: 45000, region: 'Worldwide', type: 'YouTube Channel', size: '1K subs' },
      { name: 'YouTube Channel - 10K Subs', description: 'YouTube channel with 10K subscribers', price: 180000, region: 'Worldwide', type: 'YouTube Channel', size: '10K subs' },
      
      // Instagram Accounts
      { name: 'Instagram Account - New', description: 'New Instagram account', price: 6500, region: 'Worldwide', type: 'Instagram Account', size: '1 account' },
      { name: 'Instagram Account - Aged', description: 'Aged Instagram account', price: 9500, region: 'Worldwide', type: 'Instagram Account', size: '1 account' },
      { name: 'Instagram Followers - 10K', description: '10K Instagram followers', price: 35000, region: 'Worldwide', type: 'Instagram Followers', size: '10K followers' },
      
      // Twitter Accounts
      { name: 'Twitter Account - New', description: 'New Twitter/X account', price: 4500, region: 'Worldwide', type: 'Twitter Account', size: '1 account' },
      { name: 'Twitter Account - Aged', description: 'Aged Twitter account', price: 7000, region: 'Worldwide', type: 'Twitter Account', size: '1 account' },
      { name: 'Twitter Followers - 50K', description: '50K Twitter followers', price: 125000, region: 'Worldwide', type: 'Twitter Followers', size: '50K followers' },
      
      // LinkedIn Accounts
      { name: 'LinkedIn Account - Personal', description: 'LinkedIn personal account', price: 8500, region: 'Worldwide', type: 'LinkedIn Account', size: '1 account' },
      { name: 'LinkedIn Account - Business', description: 'LinkedIn business account', price: 15000, region: 'Worldwide', type: 'LinkedIn Account', size: '1 account' },
      { name: 'LinkedIn Premium Account', description: 'LinkedIn premium subscription', price: 22000, region: 'Worldwide', type: 'LinkedIn Account', size: 'Premium' },
      
      // Streaming Services
      { name: 'Netflix Premium', description: 'Netflix premium with 4K', price: 18500, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      { name: 'Disney+ Access', description: 'Disney Plus subscription', price: 12000, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      { name: 'HBO Max Account', description: 'HBO Max streaming account', price: 14500, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      { name: 'Hulu Premium', description: 'Hulu premium account', price: 13500, region: 'Worldwide', type: 'Streaming', size: '1 month' },
      
      // Spotify & Music
      { name: 'Spotify Premium Account', description: 'Spotify premium subscription', price: 12500, region: 'Worldwide', type: 'Music', size: '1 month' },
      { name: 'Apple Music Account', description: 'Apple Music subscription', price: 9500, region: 'Worldwide', type: 'Music', size: '1 month' },
      
      // Crypto & Financial
      { name: 'Binance Account - Verified', description: 'Verified Binance crypto exchange account', price: 35000, region: 'Worldwide', type: 'Crypto Exchange', size: '1 account' },
      { name: 'Coinbase Account - Verified', description: 'Verified Coinbase account', price: 32000, region: 'Worldwide', type: 'Crypto Exchange', size: '1 account' },
      { name: 'PayPal Account - Verified', description: 'Verified PayPal account', price: 18500, region: 'Worldwide', type: 'Payment', size: '1 account' },
      { name: 'Stripe Account - Setup', description: 'Stripe payment account setup', price: 22000, region: 'Worldwide', type: 'Payment', size: '1 account' },
      
      // Snapchat & Telegram
      { name: 'Snapchat Account - New', description: 'New Snapchat account', price: 3500, region: 'Worldwide', type: 'Snapchat Account', size: '1 account' },
      { name: 'Telegram Account - Verified', description: 'Verified Telegram account', price: 8500, region: 'Worldwide', type: 'Telegram Account', size: '1 account' },
      { name: 'WhatsApp Business Account', description: 'WhatsApp business verified account', price: 9500, region: 'Worldwide', type: 'WhatsApp', size: '1 account' },
      
      // Gaming & Other
      { name: 'Xbox Game Pass', description: 'Xbox Game Pass subscription', price: 12000, region: 'Worldwide', type: 'Gaming', size: '1 month' },
      { name: 'Twitch Channel - Affiliate', description: 'Twitch affiliate channel', price: 45000, region: 'Worldwide', type: 'Twitch Channel', size: 'Affiliate' },
      { name: 'Discord Server Setup', description: 'Professional Discord server setup', price: 25000, region: 'Worldwide', type: 'Server Setup', size: 'Full Setup' },
      { name: 'Amazon Prime Account', description: 'Amazon Prime membership', price: 15000, region: 'Worldwide', type: 'Shopping', size: '1 year' },
      { name: 'Email Bundle - Format UID|PASS|2FA', price: 7.99, category: 'Email', desc: 'Email with credentials in specified format' },
      
      // TikTok
      { name: 'TikTok Account - Verified', price: 5.99, category: 'Social Media', desc: 'Verified TikTok account' },
      { name: 'TikTok Account - With Followers', price: 29.99, category: 'Social Media', desc: 'TikTok account with followers' },
      
      // Streaming
      { name: 'Netflix Account - 1 Month', price: 8.99, category: 'Streaming', desc: '1 month Netflix access' },
      { name: 'Netflix Account - 3 Months', price: 24.99, category: 'Streaming', desc: '3 months Netflix access' },
      { name: 'Spotify Premium - 1 Month', price: 9.99, category: 'Streaming', desc: 'Spotify premium monthly' },
      
      // Gaming
      { name: 'Steam Account - Verified', price: 12.99, category: 'Gaming', desc: 'Verified Steam account' },
      { name: 'PlayStation Network Account', price: 14.99, category: 'Gaming', desc: 'PSN account with access' },
      { name: 'Xbox Game Pass - 1 Month', price: 11.99, category: 'Gaming', desc: 'Xbox Game Pass subscription' },
      
      // Design & Creative
      { name: 'Adobe Creative Cloud - 1 Month', price: 19.99, category: 'Software', desc: 'Adobe CC full access 1 month' },
      { name: 'Canva Pro - 3 Months', price: 17.99, category: 'Software', desc: 'Canva Pro subscription 3 months' },
      
      // Dating & Social
      { name: 'Facebook Dating Setup', price: 9.99, category: 'Facebook Dating', desc: 'Facebook Dating account setup' },
      { name: 'Tinder Plus - 1 Month', price: 13.99, category: 'Social Media', desc: 'Tinder Plus monthly' },
    ];

    let createdCount = 0;

    for (const product of products) {
      try {
        // Create as INTERNAL product so it works with existing admin flow
        const newProduct = {
          id: generateId(),
          name: product.name,
          description: product.description,
          price: product.price, // Use price as-is (already in correct currency)
          region: product.region,
          type: product.type,
          size: product.size,
          image: `https://images.unsplash.com/photo-1516321318423-f06f70d504d0?w=400&h=300&fit=crop&q=80`,
          createdAt: new Date()
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

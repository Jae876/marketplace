import { NextRequest, NextResponse } from 'next/server';
import { dbPostgres } from '@/lib/db-postgres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * DEV ONLY: Create sample external products for demonstration
 * These are quality sample products that showcase the system
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[SAMPLE-PRODUCTS] Creating sample products');

    const sampleProducts = [
      {
        sourceId: 'sample_001',
        name: 'Advanced Python Programming Course',
        description: 'Master advanced Python concepts including decorators, metaclasses, async programming, and design patterns. 8 hours of video content with hands-on projects.',
        price: 49.99,
        category: 'course',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f70d504d0?w=500&h=300&fit=crop'
      },
      {
        sourceId: 'sample_002',
        name: 'Complete Web Design Toolkit',
        description: 'Professional UI kit with 500+ components, templates, and design systems. Includes Figma files and code exports for React, Vue, and HTML.',
        price: 79.99,
        category: 'template',
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=300&fit=crop'
      },
      {
        sourceId: 'sample_003',
        name: 'The Complete Digital Marketing Guide 2024',
        description: 'Comprehensive eBook covering SEO, SEM, social media marketing, email marketing, and conversion optimization. 250+ pages of actionable strategies.',
        price: 29.99,
        category: 'ebook',
        image: 'https://images.unsplash.com/photo-1460925895917-adf4e565db1d?w=500&h=300&fit=crop'
      },
      {
        sourceId: 'sample_004',
        name: 'Freelance Web Development Starter Pack',
        description: 'Everything you need to launch a freelance web dev career. Templates, proposal samples, contract templates, pricing guides, and client management tools.',
        price: 39.99,
        category: 'service',
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop'
      },
      {
        sourceId: 'sample_005',
        name: 'Stock Video Bundle - 1000 Clips',
        description: '1000 high-quality stock video clips in 4K. Perfect for YouTube, TikTok, Instagram content. Includes transitions, overlays, and background footage.',
        price: 99.99,
        category: 'media',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=300&fit=crop'
      },
      {
        sourceId: 'sample_006',
        name: 'AI Prompt Engineering Masterclass',
        description: 'Learn to write effective prompts for ChatGPT, Claude, and other AI models. Includes 200+ tested prompts for copywriting, coding, and content creation.',
        price: 34.99,
        category: 'course',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&h=300&fit=crop'
      },
      {
        sourceId: 'sample_007',
        name: 'Email Marketing Automation System',
        description: 'Ready-to-use email sequences, landing pages, and Zapier automations. Increase conversions by 300% with proven copywriting and automation strategies.',
        price: 44.99,
        category: 'template',
        image: 'https://images.unsplash.com/photo-1542851941-3fb9c7a9acd2?w=500&h=300&fit=crop'
      },
      {
        sourceId: 'sample_008',
        name: 'The Entrepreneur\'s Legal Guide',
        description: 'Comprehensive guide to business law, contracts, privacy policies, and legal protection. Templates for LLC formation, NDAs, and client agreements.',
        price: 19.99,
        category: 'ebook',
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=300&fit=crop'
      }
    ];

    let createdCount = 0;

    for (const product of sampleProducts) {
      try {
        const productData = {
          id: generateId(),
          source: 'theowlet.store',
          sourceId: product.sourceId,
          name: product.name,
          description: product.description,
          originalPrice: product.price,
          currentPrice: product.price,
          region: 'global',
          type: product.category,
          size: undefined,
          image: product.image
        };

        await dbPostgres.syncExternalProduct(product.sourceId, productData);
        createdCount++;
        console.log(`[SAMPLE-PRODUCTS] Created: ${product.name}`);
      } catch (error) {
        console.error(`[SAMPLE-PRODUCTS] Error creating product:`, error);
      }
    }

    console.log(`[SAMPLE-PRODUCTS] Created ${createdCount} sample products`);

    return NextResponse.json({
      message: 'Sample products created',
      created: createdCount,
      total: sampleProducts.length
    });
  } catch (error: any) {
    console.error('[SAMPLE-PRODUCTS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create sample products' },
      { status: 500 }
    );
  }
}

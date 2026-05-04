interface ScrapedProduct {
  sourceId: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category?: string;
}

/**
 * Parse HTML and extract product information using regex and string methods
 */
function parseProductsFromHTML(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];

  try {
    // Extract product data using regex patterns
    // Look for common product markup patterns
    
    // Pattern 1: JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      jsonLdMatch.forEach((match) => {
        try {
          const jsonStr = match.replace(/<[^>]*>/g, '');
          const jsonData = JSON.parse(jsonStr);
          
          if (jsonData['@type'] === 'Product' || (Array.isArray(jsonData) && jsonData[0]?.['@type'] === 'Product')) {
            const productsData = Array.isArray(jsonData) ? jsonData : [jsonData];
            
            productsData.forEach((item: any, index: number) => {
              if (item.name && item.offers?.price) {
                products.push({
                  sourceId: `theowlet_json_${index}_${Date.now()}`,
                  name: item.name,
                  description: item.description || '',
                  price: parseFloat(item.offers.price) || 0,
                  image: item.image,
                  category: item.category || 'digital'
                });
              }
            });
          }
        } catch (jsonError) {
          console.warn('[SCRAPER] Error parsing JSON-LD:', jsonError);
        }
      });
    }

    // Pattern 2: Look for product divs/cards with data attributes
    const productCardRegex = /class="[^"]*product[^"]*"[\s\S]*?<\/(?:div|article)>/gi;
    const matches = html.matchAll(productCardRegex);

    for (const match of matches) {
      try {
        const cardHTML = match[0];
        
        // Extract name
        const nameMatch = cardHTML.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/);
        const name = nameMatch ? nameMatch[1].trim() : '';

        // Extract price
        const priceMatch = cardHTML.match(/\$?([\d,.]+)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;

        // Extract image
        const imageMatch = cardHTML.match(/src="([^"]*\.(?:jpg|jpeg|png|gif|webp))"/i);
        const image = imageMatch ? imageMatch[1] : undefined;

        // Extract description
        const descMatch = cardHTML.match(/<p[^>]*>([^<]+)<\/p>/);
        const description = descMatch ? descMatch[1].trim() : '';

        if (name && price > 0) {
          products.push({
            sourceId: `theowlet_card_${Date.now()}_${Math.random()}`,
            name,
            description,
            price,
            image,
            category: 'digital'
          });
        }
      } catch (matchError) {
        console.warn('[SCRAPER] Error parsing product card:', matchError);
      }
    }
  } catch (error) {
    console.warn('[SCRAPER] Error in product parsing:', error);
  }

  return products;
}

/**
 * Scrape products from theowlet.store
 */
export async function scrapeTheOwletProducts(): Promise<ScrapedProduct[]> {
  try {
    const url = 'https://theowlet.store';
    console.log('[SCRAPER] Fetching products from:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch ${url}`);
    }

    const html = await response.text();
    const products = parseProductsFromHTML(html);

    console.log('[SCRAPER] Successfully scraped', products.length, 'products');
    return products;
  } catch (error) {
    console.error('[SCRAPER] Error scraping theowlet.store:', error);
    return [];
  }
}

/**
 * Auto-categorize products based on name, description, and category hints
 */
export function categorizeProduct(product: ScrapedProduct): {
  type: string;
  region: string;
} {
  const text = `${product.name} ${product.description} ${product.category}`.toLowerCase();

  // Type detection
  let type = 'digital';
  
  const typeKeywords: Record<string, string[]> = {
    'software': ['software', 'app', 'tool', 'plugin', 'script', 'code', 'template'],
    'course': ['course', 'training', 'tutorial', 'lesson', 'education'],
    'ebook': ['ebook', 'book', 'guide', 'pdf', 'document'],
    'service': ['service', 'design', 'consulting', 'development'],
    'media': ['photo', 'video', 'music', 'audio', 'image', 'graphic'],
    'digital': ['digital', 'virtual', 'download']
  };

  for (const [typeKey, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      type = typeKey;
      break;
    }
  }

  // Region detection
  let region = 'global';

  const regionKeywords: Record<string, string[]> = {
    'usa': ['usa', 'united states', 'us', 'american', 'us-only'],
    'uk': ['uk', 'united kingdom', 'england', 'british'],
    'eu': ['eu', 'europe', 'european'],
    'asia': ['asia', 'asian', 'jp', 'japan', 'china', 'cn'],
    'global': ['worldwide', 'international', 'global']
  };

  for (const [regionKey, keywords] of Object.entries(regionKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      region = regionKey;
      break;
    }
  }

  return { type, region };
}

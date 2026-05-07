interface ScrapedProduct {
  sourceId: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category?: string;
}

/**
 * Parse HTML and extract product information using multiple strategies
 */
function parseProductsFromHTML(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];

  try {
    // Strategy 1: Look for product containers with common e-commerce patterns
    // Match divs that contain product price and add buttons
    const productContainers = html.match(/<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
    
    console.log('[SCRAPER] Found', productContainers.length, 'product containers');

    productContainers.forEach((container, index) => {
      try {
        // Extract product name/title
        let nameMatch = container.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/i);
        let name = nameMatch ? nameMatch[1].trim() : '';

        // Try alternate name patterns
        if (!name) {
          nameMatch = container.match(/title="([^"]*)"/i);
          name = nameMatch ? nameMatch[1].trim() : '';
        }
        if (!name) {
          nameMatch = container.match(/>([^<]{5,100})<\/[ab]/i);
          name = nameMatch ? nameMatch[1].trim().substring(0, 100) : '';
        }

        // Extract price (look for currency symbols and numbers)
        let priceMatch = container.match(/[₦$€£¥][\s]*([\d,]+(?:\.?\d{0,2})?)/i);
        let price = 0;
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }

        // Fallback: look for standalone numbers that look like prices
        if (price === 0 || isNaN(price)) {
          priceMatch = container.match(/([\d]{1,6}(?:[\.,]\d{0,2})?)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(/,/g, '.'));
          }
        }

        // Extract description
        let descMatch = container.match(/<p[^>]*>([^<]+)<\/p>/i);
        let description = descMatch ? descMatch[1].trim() : '';

        // Try alternate description patterns
        if (!description) {
          descMatch = container.match(/Format:([^<]*)</i);
          description = descMatch ? descMatch[1].trim() : '';
        }

        // Extract image
        let imageMatch = container.match(/src="([^"]*\.(?:jpg|jpeg|png|gif|webp))"/i);
        let image = imageMatch ? imageMatch[1] : undefined;

        // Extract category from container classes or structure
        let category = 'digital';
        const categoryMatch = container.match(/class="[^"]*category[^"]*"[^>]*>([^<]+)/i);
        if (categoryMatch) {
          category = categoryMatch[1].toLowerCase().substring(0, 50);
        }

        // Only add if we have at least a name and price
        if (name && name.length > 2 && price > 0) {
          products.push({
            sourceId: `theowlet_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.substring(0, 255),
            description: description.substring(0, 1000),
            price: price,
            image: image,
            category: category
          });
        }
      } catch (containerError) {
        console.warn('[SCRAPER] Error parsing product container:', containerError);
      }
    });

    // Strategy 2: Look for price patterns with associated text
    if (products.length === 0) {
      console.log('[SCRAPER] Trying alternative extraction patterns');
      
      // Look for price followed by product name pattern
      const priceProductRegex = /[₦$€£¥][\s]*([\d,]+(?:\.?\d{0,2})?)[^<]*?<[^>]*>([^<]{5,150})</gi;
      let match;
      
      while ((match = priceProductRegex.exec(html)) !== null && products.length < 100) {
        try {
          const price = parseFloat(match[1].replace(/,/g, ''));
          const name = match[2].trim().substring(0, 255);
          
          if (price > 0 && name.length > 2) {
            products.push({
              sourceId: `theowlet_alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: name,
              description: '',
              price: price,
              image: undefined,
              category: 'digital'
            });
          }
        } catch (e) {
          // Continue on error
        }
      }
    }

    // Remove duplicates
    const uniqueProducts = Array.from(
      new Map(products.map(p => [p.name.toLowerCase(), p])).values()
    );

    return uniqueProducts;
  } catch (error) {
    console.warn('[SCRAPER] Error in product parsing:', error);
  }

  return products;
}

/**
 * Scrape products from theowlet.store by fetching all category pages
 */
export async function scrapeTheOwletProducts(): Promise<ScrapedProduct[]> {
  try {
    const allProducts: ScrapedProduct[] = [];
    const baseUrl = 'https://theowlet.store';
    
    console.log('[SCRAPER] Starting to scrape theowlet.store');

    // Try to fetch the main page first to find categories
    const mainResponse = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!mainResponse.ok) {
      console.log('[SCRAPER] Main page fetch failed, trying direct product extraction');
      return [];
    }

    const html = await mainResponse.text();
    
    // Try to extract products directly from main page
    const products = parseProductsFromHTML(html);
    
    if (products.length > 0) {
      console.log('[SCRAPER] Extracted', products.length, 'products from main page');
      return products;
    }

    // If no products found, try extracting category URLs and scraping each
    console.log('[SCRAPER] No products found on main page, attempting category extraction');
    
    // Look for category links in the sidebar
    const categoryRegex = /href="([^"]*\/category\/[^"]*|[^"]*\/shop\/[^"]*|[^"]*shop[^"]*)"[^>]*>([^<]+)</gi;
    const categories = new Set<string>();
    let categoryMatch;
    
    while ((categoryMatch = categoryRegex.exec(html)) !== null) {
      let url = categoryMatch[1];
      if (url.startsWith('/')) {
        url = baseUrl + url;
      } else if (!url.startsWith('http')) {
        url = baseUrl + '/' + url;
      }
      categories.add(url);
    }

    console.log('[SCRAPER] Found', categories.size, 'categories');

    // Scrape each category (limit to first 5 to avoid too many requests)
    let categoryCount = 0;
    for (const categoryUrl of Array.from(categories).slice(0, 5)) {
      if (categoryCount >= 3) break; // Limit category scraping
      
      try {
        console.log('[SCRAPER] Scraping category:', categoryUrl);
        const categoryResponse = await fetch(categoryUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (categoryResponse.ok) {
          const categoryHtml = await categoryResponse.text();
          const categoryProducts = parseProductsFromHTML(categoryHtml);
          allProducts.push(...categoryProducts);
          categoryCount++;
        }
      } catch (catError) {
        console.warn('[SCRAPER] Error scraping category:', catError);
      }
    }

    console.log('[SCRAPER] Successfully scraped', allProducts.length, 'products total');
    return allProducts;
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

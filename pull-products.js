#!/usr/bin/env node

/**
 * Direct one-time product pull from theowlet.store
 * This script directly uses the database and scraper functions
 * to populate products without needing HTTP authentication
 */

import { dbPostgres } from './lib/db-postgres.js';
import { scrapeTheOwletProducts, categorizeProduct } from './lib/scrapers/theowlet-scraper.js';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function pullProducts() {
  console.log('\n🚀 Starting one-time product pull from theowlet.store\n');
  
  try {
    // Step 1: Scrape products
    console.log('📡 Step 1: Fetching products from theowlet.store...');
    const scrapedProducts = await scrapeTheOwletProducts();
    
    if (scrapedProducts.length === 0) {
      console.log('❌ No products found on theowlet.store');
      return;
    }
    
    console.log(`✅ Found ${scrapedProducts.length} products\n`);
    
    // Step 2: Sync to database
    console.log('💾 Step 2: Storing products in database...');
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const scrapedProduct of scrapedProducts) {
      try {
        const { type, region } = categorizeProduct(scrapedProduct);
        
        const productData = {
          id: generateId(),
          source: 'theowlet.store',
          sourceId: scrapedProduct.sourceId,
          name: scrapedProduct.name,
          description: scrapedProduct.description,
          originalPrice: scrapedProduct.price,
          currentPrice: scrapedProduct.price,
          region,
          type,
          size: undefined,
          image: scrapedProduct.image
        };
        
        await dbPostgres.syncExternalProduct(scrapedProduct.sourceId, productData);
        syncedCount++;
        console.log(`  ✓ ${scrapedProduct.name} (${type} - ${region})`);
      } catch (productError) {
        errorCount++;
        console.error(`  ❌ Error syncing: ${scrapedProduct.name}`, productError.message);
      }
    }
    
    console.log(`\n✅ Sync complete!`);
    console.log(`   Synced: ${syncedCount} products`);
    console.log(`   Errors: ${errorCount} products`);
    
    // Step 3: Verify products are in database
    console.log('\n🔍 Step 3: Verifying products in database...');
    const dbProducts = await dbPostgres.getExternalProducts();
    console.log(`✅ Database contains ${dbProducts.length} external products`);
    
    if (dbProducts.length > 0) {
      console.log('\n📦 Sample products:');
      dbProducts.slice(0, 3).forEach((p, i) => {
        console.log(`\n  ${i + 1}. ${p.name}`);
        console.log(`     Price: $${p.currentPrice}`);
        console.log(`     Type: ${p.type}`);
        console.log(`     Region: ${p.region}`);
      });
    }
    
    console.log('\n🎉 Products are now live on your platform!');
    console.log('   - Users can see them on the marketplace');
    console.log('   - Admin can edit prices and details');
    console.log('   - They work with all your payment systems\n');
    
  } catch (error) {
    console.error('\n❌ Error during product pull:', error);
  }
  
  process.exit(0);
}

pullProducts();

#!/usr/bin/env node

/**
 * Direct database test - Check if external products table exists and works
 * Run with: node test-db-direct.js
 */

import { dbPostgres } from './lib/db-postgres.js';

async function testDatabase() {
  console.log('[DB-TEST] Starting external products database test...\n');

  try {
    console.log('[DB-TEST] 1. Checking if external_products table exists and querying it...');
    const products = await dbPostgres.getExternalProducts();
    console.log(`[DB-TEST] ✅ Query successful. Found ${products.length} external products in database`);

    if (products.length === 0) {
      console.log('[DB-TEST] ℹ️  No external products yet - they need to be synced from theowlet.store');
      console.log('[DB-TEST] 2. To sync products, you need to:');
      console.log('     - Go to /admin');
      console.log('     - Log in with your admin credentials');
      console.log('     - Click "🔗 External Products" tab');
      console.log('     - Click "🔄 Sync Products from theowlet.store" button');
    } else {
      console.log('[DB-TEST] 📦 Sample products:');
      products.slice(0, 2).forEach((p, i) => {
        console.log(`\n  Product ${i + 1}:`);
        console.log(`    Name: ${p.name}`);
        console.log(`    Price: $${p.currentPrice}`);
        console.log(`    Region: ${p.region}`);
        console.log(`    Type: ${p.type}`);
      });
    }

    console.log('\n[DB-TEST] 3. Testing /api/products aggregation...');
    console.log('[DB-TEST] This endpoint combines internal + external products');
    console.log('[DB-TEST] When external products are synced, they will appear in:');
    console.log('     - User marketplace (/page)')
    console.log('     - User dashboard (/dashboard)');
    console.log('     - Admin view (/admin)');

  } catch (error) {
    console.error('[DB-TEST] ❌ Error:', error.message);
    console.log('\n[DB-TEST] Troubleshooting:');
    console.log('  1. Check DATABASE_URL environment variable is set');
    console.log('  2. Verify Neon database is accessible');
    console.log('  3. Check network connectivity');
  }
}

testDatabase();

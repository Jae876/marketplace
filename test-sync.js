#!/usr/bin/env node

/**
 * Direct sync test - Triggers product sync from theowlet.store
 * Run with: node test-sync.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testSync() {
  console.log('[TEST] Starting external product sync test...\n');

  try {
    // Step 1: Trigger sync endpoint
    console.log('[TEST] Step 1: Triggering POST /api/admin/sync-external-products');
    console.log(`[TEST] Target: ${BASE_URL}/api/admin/sync-external-products\n`);

    const syncResponse = await fetch(`${BASE_URL}/api/admin/sync-external-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'admin_session=' + generateAdminSession()
      }
    });

    console.log('[TEST] Response status:', syncResponse.status);
    const syncData = await syncResponse.json();
    console.log('[TEST] Sync response:', JSON.stringify(syncData, null, 2));

    if (!syncResponse.ok) {
      console.log('[TEST] ❌ Sync failed. This may be due to:');
      console.log('  - Admin session not valid');
      console.log('  - Scraper unable to fetch from theowlet.store');
      console.log('  - Database connection issue');
      return;
    }

    console.log(`\n[TEST] ✅ Sync successful! Synced ${syncData.synced} products\n`);

    // Step 2: Verify products in database
    console.log('[TEST] Step 2: Fetching synced products via GET /api/admin/sync-external-products');
    const getResponse = await fetch(`${BASE_URL}/api/admin/sync-external-products`, {
      headers: {
        'Cookie': 'admin_session=' + generateAdminSession()
      }
    });

    const getDataText = await getResponse.text();
    console.log('[TEST] Get response text:', getDataText.substring(0, 500));

    if (getResponse.ok && getDataText) {
      const getData = JSON.parse(getDataText);
      console.log(`[TEST] ✅ Retrieved ${getData.external_products?.length || 0} products from database\n`);

      if (getData.external_products && getData.external_products.length > 0) {
        console.log('[TEST] Sample product:');
        console.log(JSON.stringify(getData.external_products[0], null, 2));
      }
    }

    // Step 3: Check /api/products aggregation
    console.log('\n[TEST] Step 3: Testing /api/products endpoint (should include external products)');
    const productsResponse = await fetch(`${BASE_URL}/api/products`, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      const externalCount = productsData.products?.filter((p) => p.source === 'external')?.length || 0;
      console.log(`[TEST] ✅ /api/products returned ${productsData.products?.length || 0} total products`);
      console.log(`[TEST]    - External products: ${externalCount}`);

      if (externalCount > 0) {
        console.log('[TEST] ✅ External products are showing in the aggregated endpoint!');
      }
    }

    console.log('\n[TEST] 🎉 Sync test complete! Check your marketplace to see the products.');
  } catch (error) {
    console.error('[TEST] ❌ Error:', error.message);
    console.log('\n[TEST] Troubleshooting tips:');
    console.log('  1. Ensure your app is running on', BASE_URL);
    console.log('  2. Check that DATABASE_URL is set correctly');
    console.log('  3. Verify theowlet.store is accessible');
  }
}

function generateAdminSession() {
  // Generate a valid admin session token (64 hex characters)
  // In production, this should come from actual admin login
  const chars = '0123456789abcdef';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

testSync();

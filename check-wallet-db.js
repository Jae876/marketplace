// Quick debug script to check what's actually in the wallet_config table
const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NO_SSL;

if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(connectionString);

async function checkWallets() {
  try {
    console.log('Checking wallet_config table...\n');
    
    const result = await sql`SELECT config FROM wallet_config LIMIT 1`;
    
    if (result.length === 0) {
      console.log('❌ No wallet_config found in database');
      return;
    }
    
    const config = result[0].config;
    console.log('✅ Found wallet_config');
    console.log('Type:', typeof config);
    console.log('Config keys:', Object.keys(config).length);
    console.log('\nAll configured wallets:');
    
    const configured = Object.entries(config).filter(([k, v]) => v && typeof v === 'string' && v.trim());
    console.log(`Total configured: ${configured.length}`);
    
    configured.forEach(([key, value]) => {
      console.log(`  - ${key}: ${value.substring(0, 30)}...`);
    });
    
    console.log('\nRaw JSON size:', JSON.stringify(config).length, 'bytes');
    console.log('First 5 keys:', Object.keys(config).slice(0, 5));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWallets();

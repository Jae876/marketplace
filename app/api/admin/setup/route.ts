import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

// CRITICAL: Initialize database schema on Vercel deployment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL_NO_SSL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function setupDatabase() {
  try {
    console.log('[DB SETUP] Starting database initialization...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        "securityPhrase" VARCHAR(255) NOT NULL,
        balance DECIMAL(18, 8) DEFAULT 0,
        "trustScore" INTEGER DEFAULT 50,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB SETUP] ✅ users table ready');

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(18, 8) NOT NULL,
        region VARCHAR(255),
        type VARCHAR(255),
        size VARCHAR(255),
        image TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB SETUP] ✅ products table ready');

    // Create transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        "productId" VARCHAR(255) NOT NULL,
        "buyerId" VARCHAR(255) NOT NULL,
        "sellerId" VARCHAR(255) NOT NULL,
        amount DECIMAL(18, 8) NOT NULL,
        cryptocurrency VARCHAR(50),
        "walletAddress" VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        "paymentConfirmedByAdmin" BOOLEAN DEFAULT FALSE,
        "buyerConfirmedRelease" BOOLEAN DEFAULT FALSE,
        "itemDeliveryContent" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "confirmedAt" TIMESTAMP,
        FOREIGN KEY ("productId") REFERENCES products(id),
        FOREIGN KEY ("buyerId") REFERENCES users(id),
        FOREIGN KEY ("sellerId") REFERENCES users(id)
      )
    `);
    console.log('[DB SETUP] ✅ transactions table ready');

    // Create item_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_messages (
        id VARCHAR(255) PRIMARY KEY,
        "transactionId" VARCHAR(255),
        "buyerId" VARCHAR(255) NOT NULL,
        "sellerId" VARCHAR(255) NOT NULL,
        "productName" VARCHAR(255),
        "itemContent" TEXT,
        amount DECIMAL(18, 8),
        cryptocurrency VARCHAR(50),
        "isRead" BOOLEAN DEFAULT FALSE,
        "isWelcome" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("transactionId") REFERENCES transactions(id),
        FOREIGN KEY ("buyerId") REFERENCES users(id),
        FOREIGN KEY ("sellerId") REFERENCES users(id)
      )
    `);
    console.log('[DB SETUP] ✅ item_messages table ready');

    // Create wallets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) UNIQUE NOT NULL,
        address VARCHAR(255) NOT NULL,
        balance DECIMAL(18, 8) DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id)
      )
    `);
    console.log('[DB SETUP] ✅ wallets table ready');

    // Create wallet_config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_config (
        id SERIAL PRIMARY KEY,
        config JSONB DEFAULT '{}',
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB SETUP] ✅ wallet_config table ready');

    console.log('[DB SETUP] ✅ All database tables initialized successfully!');
    return true;
  } catch (error: any) {
    console.error('[DB SETUP] Error during database setup:', error.message);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  // Security: Only allow from Vercel deployment or localhost
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  
  const isVercel = host?.includes('vercel.app');
  const isLocalhost = host?.includes('localhost');
  
  if (!isVercel && !isLocalhost) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await setupDatabase();
    return NextResponse.json({
      success: true,
      message: 'Database tables initialized successfully',
      tables: ['users', 'products', 'transactions', 'item_messages', 'wallets', 'wallet_config']
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to initialize database'
      },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

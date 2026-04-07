import { neon } from '@neondatabase/serverless';
import type { User, Product, Transaction, ItemMessage, Wallet, WalletConfig } from './db';

// Initialize Neon serverless client
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NO_SSL;

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_URL_NO_SSL environment variable is required');
}

const sql = neon(connectionString);

// Track if tables have been initialized
let tablesInitialized = false;

/**
 * Initialize all required database tables
 * Uses CREATE TABLE IF NOT EXISTS for idempotency
 */
async function initializeTables() {
  if (tablesInitialized) return;
  
  try {
    console.log('[NEON] Starting table initialization...');

    // Create users table
    await sql`
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
        "referralCode" VARCHAR(12) UNIQUE,
        "referredBy" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add referralCode and referredBy columns if they don't exist (migration)
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "referralCode" VARCHAR(12) UNIQUE`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "referredBy" VARCHAR(255)`;
      console.log('[NEON] ✓ users table migration applied');
    } catch (migrationError: any) {
      console.log('[NEON] Migration columns may already exist:', migrationError.message);
    }

    console.log('[NEON] ✓ users table created/exists');

    // Create referrals tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id VARCHAR(255) PRIMARY KEY,
        "referrerId" VARCHAR(255) NOT NULL,
        "refereeId" VARCHAR(255) NOT NULL,
        "qualifiedAt" TIMESTAMP,
        "rewardGiven" BOOLEAN DEFAULT FALSE,
        "rewardGivenAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("referrerId") REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY ("refereeId") REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE("referrerId", "refereeId")
      )
    `;
    console.log('[NEON] ✓ referrals table created/exists');

    // Create products table
    await sql`
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
    `;
    console.log('[NEON] ✓ products table created/exists');

    // Create transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        "productId" VARCHAR(255),
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
        FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    console.log('[NEON] ✓ transactions table created/exists');

    // Ensure special SYSTEM_DEPOSIT product exists for direct balance deposits
    try {
      const systemDepositExists = await sql`SELECT id FROM products WHERE id = 'system_deposit' LIMIT 1`;
      if (!systemDepositExists || (systemDepositExists as any[]).length === 0) {
        try {
          await sql`
            INSERT INTO products (id, name, description, price, region, type, size, image, "createdAt")
            VALUES ('system_deposit', 'System Deposit', 'Direct balance deposit', 0, 'system', 'deposit', 'system', 'system', NOW())
          `;
          console.log('[NEON] ✓ System deposit product created for FK constraint');
        } catch (insertErr: any) {
          if (!insertErr.message?.includes('unique constraint')) {
            console.log('[NEON] System deposit product creation note:', insertErr.message);
          }
        }
      }
    } catch (sysDepositError: any) {
      console.warn('[NEON] Warning: Could not ensure system deposit product:', sysDepositError.message);
    }

    // Create item_messages table with isRead column
    await sql`
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
        FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    console.log('[NEON] ✓ item_messages table created/exists');

    // Create wallets table
    await sql`
      CREATE TABLE IF NOT EXISTS wallets (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) UNIQUE NOT NULL,
        address VARCHAR(255) NOT NULL,
        balance DECIMAL(18, 8) DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    console.log('[NEON] ✓ wallets table created/exists');

    // Create wallet_config table
    await sql`
      CREATE TABLE IF NOT EXISTS wallet_config (
        id SERIAL PRIMARY KEY,
        config JSONB DEFAULT '{}',
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('[NEON] ✓ wallet_config table created/exists');

    // Ensure wallet config has all required keys
    try {
      const defaultConfig = {
        ethereum: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        bitcoin: '',
        usdt: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        usdt_ethereum: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        usdt_tron: 'TUhXXVu4W3dJmqCqeqXzPKNn8fF2kEKW7K',
        usdt_polygon: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        usdt_bsc: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        usdc: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        usdc_ethereum: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        usdc_polygon: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        usdc_arbitrum: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        usdc_optimism: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        dai: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        dai_ethereum: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        dai_polygon: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        busd: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        busd_ethereum: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
        busd_bsc: '0x72ACc72FfA2b4ce6E4170e17D2416Bb27D34FaB0',
      };

      const existing = await sql`SELECT config FROM wallet_config LIMIT 1`;
      if ((existing as any[]).length === 0) {
        // Table is empty - insert default config
        await sql`INSERT INTO wallet_config (config) VALUES (${JSON.stringify(defaultConfig)})`;
        console.log('[NEON] ✓ wallet_config seeded with default wallets');
      } else {
        // Table has data - merge with defaults to ensure all keys exist
        const currentConfig = ((existing as any[])[0]?.config) || {};
        const mergedConfig = { ...defaultConfig, ...currentConfig };
        await sql`UPDATE wallet_config SET config = ${JSON.stringify(mergedConfig)} WHERE id = 1`;
        console.log('[NEON] ✓ wallet_config updated with any missing keys');
      }
    } catch (seedError: any) {
      console.log('[NEON] Wallet config setup error:', seedError.message);
    }

    // Create giveaway_state table
    await sql`
      CREATE TABLE IF NOT EXISTS giveaway_state (
        id VARCHAR(255) PRIMARY KEY,
        active BOOLEAN DEFAULT FALSE,
        "startTime" TIMESTAMP,
        "endTime" TIMESTAMP,
        discount DECIMAL(18, 8),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('[NEON] ✓ giveaway_state table created/exists');

    // Ensure 'system' admin user exists for transactions and messages
    try {
      const systemUserExists = await sql`SELECT id FROM users WHERE id = 'system' LIMIT 1`;
      if (!systemUserExists || (systemUserExists as any[]).length === 0) {
        try {
          await sql`
            INSERT INTO users (id, email, username, "firstName", "lastName", password, "securityPhrase", balance, "trustScore", "createdAt")
            VALUES ('system', 'system@admin.local', 'system', 'System', 'Admin', 'locked', 'locked', 0, 100, NOW())
          `;
          console.log('[NEON] ✓ System admin user created');
        } catch (insertErr: any) {
          if (insertErr.message?.includes('unique constraint')) {
            console.log('[NEON] System user already exists');
          } else {
            throw insertErr;
          }
        }
      }
    } catch (sysUserError: any) {
      console.warn('[NEON] Warning: Could not ensure system user exists:', sysUserError.message);
    }

    tablesInitialized = true;
    console.log('[NEON] ✅ All tables initialized successfully');
  } catch (error: any) {
    console.error('[NEON] Error initializing tables:', error.message);
    // Don't throw - let queries fail individually if schema is wrong
  }
}

// Helper functions to convert numeric fields from string to number
function normalizeProduct(product: any): Product {
  return {
    ...product,
    price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
  };
}

function normalizeProducts(products: any[]): Product[] {
  return products.map(normalizeProduct);
}

function normalizeTransaction(transaction: any): Transaction {
  return {
    ...transaction,
    amount: typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount,
  };
}

function normalizeTransactions(transactions: any[]): Transaction[] {
  return transactions.map(normalizeTransaction);
}

function normalizeWallet(wallet: any): Wallet {
  return {
    ...wallet,
    balance: typeof wallet.balance === 'string' ? parseFloat(wallet.balance) : wallet.balance,
  };
}

function normalizeWallets(wallets: any[]): Wallet[] {
  return wallets.map(normalizeWallet);
}

function normalizeItemMessage(message: any): ItemMessage {
  return {
    ...message,
    amount: typeof message.amount === 'string' ? parseFloat(message.amount) : message.amount,
  };
}

function normalizeItemMessages(messages: any[]): ItemMessage[] {
  return messages.map(normalizeItemMessage);
}

export class PostgresDatabase {
  /**
   * Generate a unique referral code (6 alphanumeric characters)
   * Format: XXXXXX (uppercase letters and numbers)
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createUser(user: User, referrerCode?: string): Promise<void> {
    await initializeTables();
    
    // Generate unique referral code for new user
    let newUserReferralCode = this.generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      try {
        const existing = await sql`SELECT id FROM users WHERE "referralCode" = ${newUserReferralCode}`;
        if ((existing as any[]).length === 0) break;
        newUserReferralCode = this.generateReferralCode();
        attempts++;
      } catch (e) {
        // Column might not exist yet, continue anyway
        break;
      }
    }

    const referredById = referrerCode ? await this.getUserByReferralCode(referrerCode) : null;
    
    try {
      // Try with referralCode columns (new schema)
      await sql`
        INSERT INTO users (id, email, username, "firstName", "lastName", password, "securityPhrase", balance, "trustScore", "referralCode", "referredBy", "createdAt")
        VALUES (${user.id}, ${user.email}, ${user.username}, ${user.firstName}, ${user.lastName},
                ${user.password}, ${user.securityPhrase}, ${user.balance ?? 0}, ${user.trustScore ?? 50}, ${newUserReferralCode}, ${referredById?.id || null}, ${user.createdAt})
      `;
    } catch (insertError: any) {
      // If referralCode columns don't exist, try without them (backwards compatibility)
      console.log('[NEON] Referral columns may not exist, trying without them:', insertError.message);
      await sql`
        INSERT INTO users (id, email, username, "firstName", "lastName", password, "securityPhrase", balance, "trustScore", "createdAt")
        VALUES (${user.id}, ${user.email}, ${user.username}, ${user.firstName}, ${user.lastName},
                ${user.password}, ${user.securityPhrase}, ${user.balance ?? 0}, ${user.trustScore ?? 50}, ${user.createdAt})
      `;
    }

    // Track referral relationship if columns exist
    if (referredById) {
      try {
        const referralId = `ref_${user.id}_${referredById.id}`;
        await sql`
          INSERT INTO referrals (id, "referrerId", "refereeId", "createdAt")
          VALUES (${referralId}, ${referredById.id}, ${user.id}, NOW())
          ON CONFLICT ("referrerId", "refereeId") DO NOTHING
        `;
      } catch (referralError) {
        // Referrals table might not exist, ignore error
        console.log('[NEON] Could not track referral (table may not exist)');
      }
    }
  }

  async getUser(id: string): Promise<User | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return (result as any[])[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    return (result as any[])[0] || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM users WHERE username = ${username}`;
    return (result as any[])[0] || null;
  }

  async getAllUsers(): Promise<User[]> {
    await initializeTables();
    return (await sql`SELECT * FROM users ORDER BY "createdAt" DESC`) as User[];
  }

  // ===== REFERRAL METHODS =====
  async getUserByReferralCode(referralCode: string): Promise<User | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM users WHERE "referralCode" = ${referralCode}`;
    return (result as any[])[0] || null;
  }

  async getReferralInfo(userId: string): Promise<any> {
    await initializeTables();
    
    try {
      // Get user's referral code
      const userResult = await sql`SELECT "referralCode" FROM users WHERE id = ${userId}`;
      const userReferralCode = (userResult as any[])[0]?.referralCode || '';
      
      // Get all referrals made by this user
      const referrals = await sql`
        SELECT 
          r.id,
          r."refereeId",
          u.username,
          u."firstName",
          u."lastName",
          u.email,
          r."qualifiedAt",
          r."rewardGiven",
          r."rewardGivenAt",
          r."createdAt",
          tx.amount as "totalDeposits"
        FROM referrals r
        JOIN users u ON r."refereeId" = u.id
        LEFT JOIN (
          SELECT "buyerId", SUM(amount) as amount 
          FROM transactions 
          WHERE status = 'completed' 
          GROUP BY "buyerId"
        ) tx ON tx."buyerId" = r."refereeId"
        WHERE r."referrerId" = ${userId}
        ORDER BY r."createdAt" DESC
      `;

      // Get user's own referral info (who referred them)
      const referrer = await sql`
        SELECT u.id, u.username, u."firstName", u."lastName" 
        FROM users u 
        WHERE u.id = (SELECT "referredBy" FROM users WHERE id = ${userId})
      `;

      // Ensure referrals is an array
      const referralArray = Array.isArray(referrals) ? referrals : [];
      console.log('[NEON] getReferralInfo for userId:', userId, 'found referrals:', referralArray.length);

      // Map and validate referrals
      const mappedReferrals = referralArray.map(r => ({
        refereeId: r.refereeId,
        username: r.username,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        qualifiedAt: r.qualifiedAt ? new Date(r.qualifiedAt) : null,
        rewardGiven: r.rewardGiven || false,
        createdAt: r.createdAt,
        totalDeposits: r.totalDeposits ? parseFloat(r.totalDeposits.toString()) : 0,
        isQualified: r.totalDeposits && parseFloat(r.totalDeposits.toString()) >= 10,
      }));

      // Calculate accurate stats
      const totalReferred = referralArray.length;
      const totalQualified = mappedReferrals.filter(r => r.isQualified || r.rewardGiven).length;
      const totalRewardsEarned = mappedReferrals.filter(r => r.rewardGiven).length * 2;
      const totalRewardsPending = mappedReferrals.filter(r => r.isQualified && !r.rewardGiven).length * 2;

      const result = {
        referralCode: userReferralCode,
        referrals: mappedReferrals,
        referrer: (referrer as any[])[0] || null,
        totalReferred,
        totalQualified,
        totalRewardsEarned,
        totalRewardsPending,
        pendingRewards: totalRewardsPending,
      };

      console.log('[NEON] getReferralInfo result:', {
        totalReferred: result.totalReferred,
        totalQualified: result.totalQualified,
        referralCount: result.referrals.length,
      });

      return result;
    } catch (error) {
      console.error('[NEON] getReferralInfo error:', error);
      return {
        referralCode: '',
        referrals: [],
        referrer: null,
        totalReferred: 0,
        totalQualified: 0,
        totalRewardsEarned: 0,
        totalRewardsPending: 0,
        pendingRewards: 0,
      };
    }
  }

  async markReferralQualified(referrerId: string, refereeId: string): Promise<void> {
    await initializeTables();
    await sql`
      UPDATE referrals 
      SET "qualifiedAt" = NOW()
      WHERE "referrerId" = ${referrerId} AND "refereeId" = ${refereeId} AND "qualifiedAt" IS NULL
    `;
  }

  async markReferralRewarded(referrerId: string, refereeId: string): Promise<void> {
    await initializeTables();
    await sql`
      UPDATE referrals 
      SET "rewardGiven" = TRUE, "rewardGivenAt" = NOW()
      WHERE "referrerId" = ${referrerId} AND "refereeId" = ${refereeId}
    `;
  }

  async checkAndRewardReferrals(userId: string, depositAmount: number): Promise<void> {
    if (depositAmount < 10) return; // Only reward if $10+

    await initializeTables();

    // Find who referred this user
    const user = await sql`SELECT "referredBy" FROM users WHERE id = ${userId}`;
    const referred_by = (user as any[])[0]?.referredBy;

    if (referred_by) {
      // Mark referral as qualified
      await this.markReferralQualified(referred_by, userId);

      // Check if reward hasn't been given yet
      const referralRecord = await sql`
        SELECT * FROM referrals 
        WHERE "referrerId" = ${referred_by} AND "refereeId" = ${userId}
      `;

      const record = (referralRecord as any[])[0];
      if (record && !record.rewardGiven) {
        // Add $2 to referrer's balance
        const referrerUser = await this.getUser(referred_by);
        if (referrerUser) {
          const newBalance = (referrerUser.balance || 0) + 2;
          await sql`UPDATE users SET balance = ${newBalance} WHERE id = ${referred_by}`;
          await this.markReferralRewarded(referred_by, userId);
          console.log(`[REFERRAL] ✓ Rewarded $2 to ${referred_by} for referral of ${userId}`);
        }
      }
    }
  }

  async updateUser(id: string, user: Partial<User>): Promise<void> {
    await initializeTables();
    
    const u = user as any;
    // Only update fields that are actually provided
    if (u.firstName) {
      await sql`UPDATE users SET "firstName" = ${u.firstName} WHERE id = ${id}`;
    }
    if (u.lastName) {
      await sql`UPDATE users SET "lastName" = ${u.lastName} WHERE id = ${id}`;
    }
    if (u.balance !== undefined) {
      await sql`UPDATE users SET balance = ${u.balance} WHERE id = ${id}`;
    }
    if (u.trustScore !== undefined) {
      await sql`UPDATE users SET "trustScore" = ${u.trustScore} WHERE id = ${id}`;
    }
  }

  async deleteUser(id: string): Promise<void> {
    await initializeTables();
    await sql`DELETE FROM users WHERE id = ${id}`;
  }

  async createProduct(product: Product): Promise<void> {
    await initializeTables();
    await sql`
      INSERT INTO products (id, name, description, price, region, type, size, image, "createdAt")
      VALUES (${product.id}, ${product.name}, ${product.description}, ${product.price}, ${product.region},
              ${product.type}, ${product.size}, ${product.image}, ${product.createdAt})
    `;
  }

  async getProduct(id: string): Promise<Product | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM products WHERE id = ${id}`;
    const product = (result as any[])[0];
    return product ? normalizeProduct(product) : null;
  }

  async getAllProducts(): Promise<Product[]> {
    await initializeTables();
    const result = await sql`SELECT * FROM products ORDER BY "createdAt" DESC`;
    return normalizeProducts(result as any[]);
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<boolean> {
    await initializeTables();
    
    const p = product as any;
    try {
      // Update each field individually since Neon only supports tagged templates
      if (p.name) {
        await sql`UPDATE products SET name = ${p.name} WHERE id = ${id}`;
      }
      if (p.description) {
        await sql`UPDATE products SET description = ${p.description} WHERE id = ${id}`;
      }
      if (p.price !== undefined) {
        await sql`UPDATE products SET price = ${p.price} WHERE id = ${id}`;
      }
      if (p.region) {
        await sql`UPDATE products SET region = ${p.region} WHERE id = ${id}`;
      }
      if (p.type) {
        await sql`UPDATE products SET type = ${p.type} WHERE id = ${id}`;
      }
      if (p.size) {
        await sql`UPDATE products SET size = ${p.size} WHERE id = ${id}`;
      }
      if (p.image) {
        await sql`UPDATE products SET image = ${p.image} WHERE id = ${id}`;
      }
      return true;
    } catch (error) {
      console.error('[DB] updateProduct error:', error);
      return false;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    await initializeTables();
    try {
      await sql`DELETE FROM products WHERE id = ${id}`;
      return true;
    } catch (error) {
      return false;
    }
  }

  async createTransaction(transaction: Transaction): Promise<void> {
    await initializeTables();
    await sql`
      INSERT INTO transactions (id, "productId", "buyerId", "sellerId", amount, cryptocurrency, "walletAddress", status, "createdAt")
      VALUES (${transaction.id}, ${transaction.productId}, ${transaction.buyerId}, ${transaction.sellerId},
              ${transaction.amount}, ${transaction.cryptocurrency}, ${transaction.walletAddress}, ${transaction.status}, ${transaction.createdAt})
    `;
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM transactions WHERE id = ${id}`;
    const transaction = (result as any[])[0];
    return transaction ? normalizeTransaction(transaction) : null;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    await initializeTables();
    const result = await sql`
      SELECT * FROM transactions WHERE "buyerId" = ${userId} OR "sellerId" = ${userId} ORDER BY "createdAt" DESC
    `;
    return normalizeTransactions(result as any[]);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    await initializeTables();
    const result = await sql`SELECT * FROM transactions ORDER BY "createdAt" DESC`;
    return normalizeTransactions(result as any[]);
  }

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<void> {
    await initializeTables();
    
    const tx = transaction as any;
    try {
      // Update transaction fields individually
      if (tx.status) {
        await sql`UPDATE transactions SET status = ${tx.status} WHERE id = ${id}`;
      }
      if (tx.paymentConfirmedByAdmin !== undefined) {
        await sql`UPDATE transactions SET "paymentConfirmedByAdmin" = ${tx.paymentConfirmedByAdmin} WHERE id = ${id}`;
      }
      if (tx.buyerConfirmedRelease !== undefined) {
        await sql`UPDATE transactions SET "buyerConfirmedRelease" = ${tx.buyerConfirmedRelease} WHERE id = ${id}`;
      }
      if (tx.itemDeliveryContent) {
        await sql`UPDATE transactions SET "itemDeliveryContent" = ${tx.itemDeliveryContent} WHERE id = ${id}`;
      }
      if (tx.confirmedAt) {
        await sql`UPDATE transactions SET "confirmedAt" = ${tx.confirmedAt} WHERE id = ${id}`;
      }
    } catch (error) {
      console.error('[DB] updateTransaction error:', error);
      throw error;
    }
  }

  async createItemMessage(message: ItemMessage): Promise<void> {
    try {
      if (!message || !message.id || !message.buyerId) {
        throw new Error('Invalid message: missing required fields (id, buyerId)');
      }
      
      await initializeTables();
      console.log(`[POSTGRES] Creating message for user ${message.buyerId}`);
      
      await sql`
        INSERT INTO item_messages (id, "transactionId", "buyerId", "sellerId", "productName", "itemContent", amount, cryptocurrency, "isRead", "isWelcome", "createdAt")
        VALUES (${message.id}, ${message.transactionId}, ${message.buyerId}, ${message.sellerId},
                ${message.productName}, ${message.itemContent}, ${message.amount}, ${message.cryptocurrency},
                ${message.isRead ?? false}, ${message.isWelcome ?? false}, ${message.createdAt})
      `;
      
      console.log(`[POSTGRES] Message created successfully for user ${message.buyerId}`);
    } catch (error: any) {
      console.error(`[POSTGRES] Error creating message for user ${message?.buyerId}:`, error);
      throw error;
    }
  }

  async getItemMessages(receiverId: string): Promise<ItemMessage[]> {
    await initializeTables();
    const result = await sql`
      SELECT * FROM item_messages WHERE "buyerId" = ${receiverId} OR "sellerId" = ${receiverId} ORDER BY "createdAt" DESC
    `;
    return normalizeItemMessages(result as any[]);
  }

  async getItemMessage(id: string): Promise<ItemMessage | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM item_messages WHERE id = ${id}`;
    const message = (result as any[])[0];
    return message ? normalizeItemMessage(message) : null;
  }

  async deleteItemMessage(id: string): Promise<void> {
    await initializeTables();
    await sql`DELETE FROM item_messages WHERE id = ${id}`;
  }

  async createWallet(wallet: Wallet): Promise<void> {
    await initializeTables();
    await sql`
      INSERT INTO wallets (id, "userId", address, balance, "createdAt")
      VALUES (${wallet.id}, ${wallet.userId}, ${wallet.address}, ${wallet.balance}, ${wallet.createdAt})
    `;
  }

  async getWallet(userId: string): Promise<Wallet | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM wallets WHERE "userId" = ${userId}`;
    const wallet = (result as any[])[0];
    return wallet ? normalizeWallet(wallet) : null;
  }

  async updateWallet(userId: string, wallet: Partial<Wallet>): Promise<void> {
    await initializeTables();
    
    const w = wallet as any;
    try {
      // Update wallet fields individually
      if (w.address) {
        await sql`UPDATE wallets SET address = ${w.address} WHERE "userId" = ${userId}`;
      }
      if (w.balance !== undefined) {
        await sql`UPDATE wallets SET balance = ${w.balance} WHERE "userId" = ${userId}`;
      }
    } catch (error) {
      console.error('[DB] updateWallet error:', error);
      throw error;
    }
  }

  async getWalletByAddress(address: string): Promise<Wallet | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM wallets WHERE address = ${address}`;
    const wallet = (result as any[])[0];
    return wallet ? normalizeWallet(wallet) : null;
  }

  async getAllWallets(): Promise<Wallet[]> {
    await initializeTables();
    const result = await sql`SELECT * FROM wallets`;
    return normalizeWallets(result as any[]);
  }

  // Giveaway Methods
  async startGiveaway(giveawayId: string, discount: number, durationHours: number): Promise<void> {
    await initializeTables();
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    try {
      // Deactivate any previous giveaways
      await sql`UPDATE giveaway_state SET active = FALSE WHERE active = TRUE`;

      // Insert new giveaway
      await sql`
        INSERT INTO giveaway_state (id, active, "startTime", "endTime", discount, "createdAt")
        VALUES (${giveawayId}, true, ${startTime.toISOString()}, ${endTime.toISOString()}, ${discount}, NOW())
      `;
      console.log('[DB] Giveaway started:', giveawayId);
    } catch (error) {
      console.error('[DB] Error starting giveaway:', error);
      throw error;
    }
  }

  async getActiveGiveaway(): Promise<any | null> {
    await initializeTables();
    try {
      const result = await sql`
        SELECT * FROM giveaway_state 
        WHERE active = TRUE AND "endTime" > NOW()
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;
      const giveaway = (result as any[])[0];
      
      if (giveaway && new Date(giveaway.endTime) < new Date()) {
        // Giveaway has expired, deactivate it
        await sql`UPDATE giveaway_state SET active = FALSE WHERE id = ${giveaway.id}`;
        return null;
      }

      return giveaway || null;
    } catch (error) {
      console.error('[DB] Error getting active giveaway:', error);
      return null;
    }
  }

  async endGiveaway(giveawayId: string): Promise<void> {
    await initializeTables();
    try {
      await sql`UPDATE giveaway_state SET active = FALSE WHERE id = ${giveawayId}`;
      console.log('[DB] Giveaway ended:', giveawayId);
    } catch (error) {
      console.error('[DB] Error ending giveaway:', error);
      throw error;
    }
  }

  // Compatibility methods
  async getUserById(id: string): Promise<User | null> {
    return await this.getUser(id);
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    return await this.getTransaction(id);
  }

  async getTransactions(): Promise<Transaction[]> {
    return await this.getAllTransactions();
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await this.getTransactionsByUser(userId);
  }

  async getUserItemMessages(userId: string): Promise<ItemMessage[]> {
    return await this.getItemMessages(userId);
  }

  async markItemMessageAsRead(messageId: string): Promise<boolean> {
    await initializeTables();
    try {
      await sql`UPDATE item_messages SET "isRead" = true WHERE id = ${messageId}`;
      return true;
    } catch (error) {
      console.error('[NEON] Error marking message as read:', error);
      return false;
    }
  }

  async getUserBalance(userId: string): Promise<number> {
    await initializeTables();
    const result = await sql`SELECT balance FROM users WHERE id = ${userId}`;
    return parseFloat((result as any[])[0]?.balance) || 0;
  }

  async getRecentDeposits(userId: string, hours: number = 24): Promise<number> {
    await initializeTables();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const result = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE "buyerId" = ${userId} AND "createdAt" > ${since} AND status = 'completed'
    `;
    return parseFloat((result as any[])[0]?.total) || 0;
  }

  async getRegions(): Promise<string[]> {
    return ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'];
  }

  async getTypes(): Promise<string[]> {
    return ['Account', 'Service', 'Digital Product', 'Physical Product', 'License', 'Subscription'];
  }

  async getSizes(): Promise<string[]> {
    return ['1', '5', '10', '25', '50', '100', 'Unlimited'];
  }

  async getWalletConfig(): Promise<WalletConfig> {
    await initializeTables();
    try {
      const result = await sql`SELECT config FROM wallet_config LIMIT 1`;
      return ((result as any[])[0]?.config) || {};
    } catch (error) {
      console.error('[NEON] Error getting wallet config:', error);
      return {};
    }
  }

  async updateWalletConfig(config: Partial<WalletConfig>): Promise<void> {
    await initializeTables();
    try {
      const existing = await sql`SELECT 1 FROM wallet_config LIMIT 1`;
      
      if ((existing as any[]).length > 0) {
        await sql`UPDATE wallet_config SET config = ${JSON.stringify(config)}`;
      } else {
        await sql`INSERT INTO wallet_config (config) VALUES (${JSON.stringify(config)})`;
      }
    } catch (error) {
      console.error('[NEON] Error updating wallet config:', error);
    }
  }
}

export const dbPostgres = new PostgresDatabase();

// Initialize tables when module is imported
initializeTables().catch(err => {
  console.warn('[NEON] Tables initialization deferred (will be created on first API call):', err.message);
});

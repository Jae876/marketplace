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
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('[NEON] ✓ users table created/exists');

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
        FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    console.log('[NEON] ✓ transactions table created/exists');

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

    tablesInitialized = true;
    console.log('[NEON] ✅ All tables initialized successfully');
  } catch (error: any) {
    console.error('[NEON] Error initializing tables:', error.message);
    // Don't throw - let queries fail individually if schema is wrong
  }
}

export class PostgresDatabase {
  async createUser(user: User): Promise<void> {
    await initializeTables();
    await sql`
      INSERT INTO users (id, email, username, "firstName", "lastName", password, "securityPhrase", balance, "trustScore", "createdAt")
      VALUES (${user.id}, ${user.email}, ${user.username}, ${user.firstName}, ${user.lastName},
              ${user.password}, ${user.securityPhrase}, ${user.balance ?? 0}, ${user.trustScore ?? 50}, ${user.createdAt})
    `;
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
    return (result as any[])[0] || null;
  }

  async getAllProducts(): Promise<Product[]> {
    await initializeTables();
    return (await sql`SELECT * FROM products ORDER BY "createdAt" DESC`) as Product[];
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
    return (result as any[])[0] || null;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    await initializeTables();
    return (await sql`
      SELECT * FROM transactions WHERE "buyerId" = ${userId} OR "sellerId" = ${userId} ORDER BY "createdAt" DESC
    `) as Transaction[];
  }

  async getAllTransactions(): Promise<Transaction[]> {
    await initializeTables();
    return (await sql`SELECT * FROM transactions ORDER BY "createdAt" DESC`) as Transaction[];
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
    await initializeTables();
    await sql`
      INSERT INTO item_messages (id, "transactionId", "buyerId", "sellerId", "productName", "itemContent", amount, cryptocurrency, "isRead", "isWelcome", "createdAt")
      VALUES (${message.id}, ${message.transactionId}, ${message.buyerId}, ${message.sellerId},
              ${message.productName}, ${message.itemContent}, ${message.amount}, ${message.cryptocurrency},
              ${message.isRead ?? false}, ${message.isWelcome ?? false}, ${message.createdAt})
    `;
  }

  async getItemMessages(receiverId: string): Promise<ItemMessage[]> {
    await initializeTables();
    return (await sql`
      SELECT * FROM item_messages WHERE "buyerId" = ${receiverId} OR "sellerId" = ${receiverId} ORDER BY "createdAt" DESC
    `) as ItemMessage[];
  }

  async getItemMessage(id: string): Promise<ItemMessage | null> {
    await initializeTables();
    const result = await sql`SELECT * FROM item_messages WHERE id = ${id}`;
    return (result as any[])[0] || null;
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
    return (result as any[])[0] || null;
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
    return (result as any[])[0] || null;
  }

  async getAllWallets(): Promise<Wallet[]> {
    await initializeTables();
    return (await sql`SELECT * FROM wallets`) as Wallet[];
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

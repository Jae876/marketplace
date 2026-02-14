import { Pool, QueryResult } from 'pg';

// Connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL_NO_SSL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize tables on first load
let tablesInitialized = false;

async function initializeTables() {
  if (tablesInitialized) return;
  
  try {
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
      );
    `);

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
      );
    `);

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
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("productId") REFERENCES products(id),
        FOREIGN KEY ("buyerId") REFERENCES users(id),
        FOREIGN KEY ("sellerId") REFERENCES users(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_messages (
        id VARCHAR(255) PRIMARY KEY,
        "itemId" VARCHAR(255),
        "senderId" VARCHAR(255) NOT NULL,
        "receiverId" VARCHAR(255) NOT NULL,
        message TEXT,
        "isWelcome" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("senderId") REFERENCES users(id),
        FOREIGN KEY ("receiverId") REFERENCES users(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) UNIQUE NOT NULL,
        address VARCHAR(255) NOT NULL,
        balance DECIMAL(18, 8) DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_config (
        id SERIAL PRIMARY KEY,
        config JSONB DEFAULT '{}',
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    tablesInitialized = true;
    console.log('[POSTGRES] Tables initialized successfully');
  } catch (error: any) {
    if (error.code === '42P07') {
      // Tables already exist
      tablesInitialized = true;
    } else {
      console.error('[POSTGRES] Error initializing tables:', error);
    }
  }
}

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  securityPhrase: string;
  balance?: number;
  trustScore?: number;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  region: string;
  type: string;
  size?: string;
  image?: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  cryptocurrency: string;
  walletAddress: string;
  status: string;
  createdAt: string;
}

interface ItemMessage {
  id: string;
  itemId?: string;
  senderId: string;
  receiverId: string;
  message: string;
  isWelcome?: boolean;
  createdAt: string;
}

interface Wallet {
  id: string;
  userId: string;
  address: string;
  balance: number;
  createdAt: string;
}

interface WalletConfig {
  [key: string]: string; // Support all 130+ cryptocurrencies dynamically
}

export class PostgresDatabase {
  async createUser(user: User): Promise<void> {
    await initializeTables();
    const query = `
      INSERT INTO users (id, email, username, "firstName", "lastName", password, "securityPhrase", balance, "trustScore", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    await pool.query(query, [
      user.id, user.email, user.username, user.firstName, user.lastName,
      user.password, user.securityPhrase, user.balance ?? 0, user.trustScore ?? 50, user.createdAt
    ]);
  }

  async getUser(id: string): Promise<User | null> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  async getAllUsers(): Promise<User[]> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM users ORDER BY "createdAt" DESC');
    return result.rows;
  }

  async updateUser(id: string, user: Partial<User>): Promise<void> {
    await initializeTables();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(user).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) return;

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    await pool.query(query, values);
  }

  async deleteUser(id: string): Promise<void> {
    await initializeTables();
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  async createProduct(product: Product): Promise<void> {
    await initializeTables();
    const query = `
      INSERT INTO products (id, name, description, price, region, type, size, image, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await pool.query(query, [
      product.id, product.name, product.description, product.price, product.region,
      product.type, product.size, product.image, product.createdAt
    ]);
  }

  async getProduct(id: string): Promise<Product | null> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getAllProducts(): Promise<Product[]> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM products ORDER BY "createdAt" DESC');
    return result.rows;
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<boolean> {
    await initializeTables();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(product).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) return false;

    values.push(id);
    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    const result = await pool.query(query, values);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await initializeTables();
    const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createTransaction(transaction: Transaction): Promise<void> {
    await initializeTables();
    const query = `
      INSERT INTO transactions (id, "productId", "buyerId", "sellerId", amount, cryptocurrency, "walletAddress", status, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await pool.query(query, [
      transaction.id, transaction.productId, transaction.buyerId, transaction.sellerId,
      transaction.amount, transaction.cryptocurrency, transaction.walletAddress, transaction.status, transaction.createdAt
    ]);
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    await initializeTables();
    const result = await pool.query(
      'SELECT * FROM transactions WHERE "buyerId" = $1 OR "sellerId" = $1 ORDER BY "createdAt" DESC',
      [userId]
    );
    return result.rows;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM transactions ORDER BY "createdAt" DESC');
    return result.rows;
  }

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<void> {
    await initializeTables();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(transaction).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) return;

    values.push(id);
    const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    await pool.query(query, values);
  }

  async createItemMessage(message: ItemMessage): Promise<void> {
    await initializeTables();
    const query = `
      INSERT INTO item_messages (id, "itemId", "senderId", "receiverId", message, "isWelcome", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await pool.query(query, [
      message.id, message.itemId, message.senderId, message.receiverId,
      message.message, message.isWelcome ?? false, message.createdAt
    ]);
  }

  async getItemMessages(receiverId: string): Promise<ItemMessage[]> {
    await initializeTables();
    const result = await pool.query(
      'SELECT * FROM item_messages WHERE "receiverId" = $1 ORDER BY "createdAt" DESC',
      [receiverId]
    );
    return result.rows;
  }

  async getItemMessage(id: string): Promise<ItemMessage | null> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM item_messages WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async deleteItemMessage(id: string): Promise<void> {
    await initializeTables();
    await pool.query('DELETE FROM item_messages WHERE id = $1', [id]);
  }

  async createWallet(wallet: Wallet): Promise<void> {
    await initializeTables();
    const query = `
      INSERT INTO wallets (id, "userId", address, balance, "createdAt")
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [wallet.id, wallet.userId, wallet.address, wallet.balance, wallet.createdAt]);
  }

  async getWallet(userId: string): Promise<Wallet | null> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM wallets WHERE "userId" = $1', [userId]);
    return result.rows[0] || null;
  }

  async updateWallet(userId: string, wallet: Partial<Wallet>): Promise<void> {
    await initializeTables();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(wallet).forEach(([key, value]) => {
      if (key !== 'userId' && value !== undefined) {
        updates.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) return;

    values.push(userId);
    const query = `UPDATE wallets SET ${updates.join(', ')} WHERE "userId" = $${paramIndex}`;
    await pool.query(query, values);
  }

  async getWalletByAddress(address: string): Promise<Wallet | null> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM wallets WHERE address = $1', [address]);
    return result.rows[0] || null;
  }

  async getAllWallets(): Promise<Wallet[]> {
    await initializeTables();
    const result = await pool.query('SELECT * FROM wallets');
    return result.rows;
  }

  // Additional helper methods for compatibility
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
      await pool.query('UPDATE item_messages SET "isRead" = true WHERE id = $1', [messageId]);
      return true;
    } catch (error) {
      console.error('[POSTGRES] Error marking message as read:', error);
      return false;
    }
  }

  async getUserBalance(userId: string): Promise<number> {
    await initializeTables();
    const result = await pool.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.balance || 0;
  }

  async getRecentDeposits(userId: string, hours: number = 24): Promise<number> {
    await initializeTables();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const result = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE "buyerId" = $1 AND "createdAt" > $2 AND status = 'completed'`,
      [userId, since]
    );
    return parseFloat(result.rows[0]?.total) || 0;
  }

  async getRegions(): Promise<string[]> {
    // Return hardcoded regions for now (same as JSON version)
    return ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'];
  }

  async getTypes(): Promise<string[]> {
    // Return hardcoded types for now (same as JSON version)
    return ['Account', 'Service', 'Digital Product', 'Physical Product', 'License', 'Subscription'];
  }

  async getSizes(): Promise<string[]> {
    // Return hardcoded sizes for now (same as JSON version)
    return ['1', '5', '10', '25', '50', '100', 'Unlimited'];
  }

  // Wallet configuration methods - stored in a dedicated table
  async getWalletConfig(): Promise<WalletConfig> {
    await initializeTables();
    try {
      const result = await pool.query('SELECT config FROM wallet_config LIMIT 1');
      return result.rows[0]?.config || {};
    } catch (error) {
      console.error('[POSTGRES] Error getting wallet config:', error);
      return {};
    }
  }

  async updateWalletConfig(config: Partial<WalletConfig>): Promise<void> {
    await initializeTables();
    try {
      // First check if config exists
      const existing = await pool.query('SELECT 1 FROM wallet_config LIMIT 1');
      
      if (existing.rows.length > 0) {
        // Update existing
        await pool.query('UPDATE wallet_config SET config = $1', [JSON.stringify(config)]);
      } else {
        // Create new
        await pool.query('INSERT INTO wallet_config (config) VALUES ($1)', [JSON.stringify(config)]);
      }
    } catch (error) {
      console.error('[POSTGRES] Error updating wallet config:', error);
    }
  }
}

export const dbPostgres = new PostgresDatabase();

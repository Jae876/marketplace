import fs from 'fs';
import path from 'path';

// Check if we should use PostgreSQL (Neon on Vercel)
const USE_POSTGRES = !!process.env.DATABASE_URL;

// Use /tmp on Vercel (serverless), use ./data locally
const DATA_DIR = process.env.VERCEL 
  ? '/tmp/data' 
  : path.join(process.cwd(), 'data');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create data directory:', error);
}

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string; // hashed
  securityPhrase: string; // 4-word phrase, hashed
  balance?: number; // Total deposited/spent amount for transparency
  trustScore?: number; // Trust score based on completed transactions (0-100)
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
  status: 'pending' | 'deposit_confirmed' | 'paid' | 'delivered' | 'completed' | 'cancelled';
  paymentConfirmedByAdmin?: boolean; // System confirmed deposit received
  buyerConfirmedRelease?: boolean; // Buyer confirmed item delivery, ready to release
  itemDeliveryContent?: string; // Item content/details delivered by admin
  createdAt: string;
  confirmedAt?: string;
}

interface ItemMessage {
  id: string;
  transactionId: string;
  buyerId: string;
  sellerId: string;
  productName: string;
  itemContent: string; // The actual item/account credentials
  amount: number;
  cryptocurrency: string;
  isRead: boolean;
  createdAt: string;
}

interface WalletConfig {
  [key: string]: string; // Support all 130+ cryptocurrencies dynamically
}

class Database {
  private usersFile = path.join(DATA_DIR, 'users.json');
  private productsFile = path.join(DATA_DIR, 'products.json');
  private transactionsFile = path.join(DATA_DIR, 'transactions.json');
  private walletsFile = path.join(DATA_DIR, 'wallets.json');
  private itemMessagesFile = path.join(DATA_DIR, 'item-messages.json');

  private readFile<T>(filePath: string, defaultValue: T): T {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
    }
    return defaultValue;
  }

  private writeFile<T>(filePath: string, data: T): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (mkdirError: any) {
        console.error(`Failed to create directory ${dir}:`, mkdirError);
        // Try direct write anyway for serverless environments
      }
      
      // Write file atomically - handle Windows file locking issues
      const tempFile = `${filePath}.tmp`;
      try {
        // Remove temp file if it exists
        if (fs.existsSync(tempFile)) {
          try {
            fs.unlinkSync(tempFile);
          } catch {}
        }
        // Write to temp file first
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
        // Atomic rename
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {}
        }
        fs.renameSync(tempFile, filePath);
      } catch (writeError: any) {
        // If atomic write fails, try direct write as fallback
        console.warn(`Atomic write failed for ${filePath}, trying direct write:`, writeError.message);
        try {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (directError) {
          console.error(`Direct write also failed for ${filePath}:`, directError);
          throw directError;
        }
      }
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error);
      throw error;
    }
  }

  // Users
  getUsers(): User[] {
    return this.readFile(this.usersFile, []);
  }

  getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email === email);
  }

  getUserByUsername(username: string): User | undefined {
    return this.getUsers().find(u => u.username === username);
  }

  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  createUser(user: User): void {
    const users = this.getUsers();
    // Initialize balance and trustScore for new users
    const newUser: User = {
      ...user,
      balance: user.balance ?? 0,
      trustScore: user.trustScore ?? 0,
    };
    users.push(newUser);
    this.writeFile(this.usersFile, users);
  }

  updateUser(id: string, updates: Partial<User>): boolean {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;
    users[index] = { ...users[index], ...updates };
    this.writeFile(this.usersFile, users);
    return true;
  }

  // Products
  getProducts(): Product[] {
    const products = this.readFile(this.productsFile, []);
    console.log('[DB] getProducts called, returning:', Array.isArray(products) ? products.length : 0, 'products');
    if (!Array.isArray(products)) {
      console.error('[DB] Products is not an array! Type:', typeof products, 'Value:', products);
      return [];
    }
    return products;
  }

  getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  getRegions(): string[] {
    const products = this.getProducts();
    return Array.from(new Set(products.map(p => p.region))).sort();
  }

  getTypes(): string[] {
    const products = this.getProducts();
    return Array.from(new Set(products.map(p => p.type))).sort();
  }

  getSizes(): string[] {
    const products = this.getProducts();
    return Array.from(new Set(products.filter(p => p.size).map(p => p.size!))).sort();
  }

  createProduct(product: Product): void {
    try {
      const products = this.getProducts();
      console.log(`[DB] Creating product. Current count: ${products.length}`);
      products.push(product);
      this.writeFile(this.productsFile, products);
      console.log(`[DB] Product created successfully. New count: ${products.length}`);
      
      // Verify the product was saved
      const verifyProducts = this.getProducts();
      const savedProduct = verifyProducts.find(p => p.id === product.id);
      if (!savedProduct) {
        console.error('[DB] WARNING: Product not found after save!');
      } else {
        console.log(`[DB] Verified product saved: ${savedProduct.name}`);
      }
    } catch (error) {
      console.error('[DB] Error creating product:', error);
      throw error;
    }
  }

  updateProduct(id: string, updates: Partial<Product>): boolean {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return false;
    products[index] = { ...products[index], ...updates };
    this.writeFile(this.productsFile, products);
    return true;
  }

  deleteProduct(id: string): boolean {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    this.writeFile(this.productsFile, filtered);
    return true;
  }

  // Transactions
  getTransactions(): Transaction[] {
    return this.readFile(this.transactionsFile, []);
  }

  getTransactionById(id: string): Transaction | undefined {
    return this.getTransactions().find(t => t.id === id);
  }

  getUserTransactions(userId: string): Transaction[] {
    return this.getTransactions().filter(
      t => t.buyerId === userId || t.sellerId === userId
    );
  }

  createTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    this.writeFile(this.transactionsFile, transactions);
  }

  updateTransaction(id: string, updates: Partial<Transaction>): boolean {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    const oldTransaction = transactions[index];
    transactions[index] = { ...transactions[index], ...updates };
    this.writeFile(this.transactionsFile, transactions);
    
    // Update user balance and trust score when transaction is completed
    if (updates.status === 'completed' && oldTransaction.status !== 'completed') {
      this.updateUserTrustAndBalance(oldTransaction.buyerId);
    }
    
    return true;
  }

  // Calculate and update user trust score and balance
  updateUserTrustAndBalance(userId: string): void {
    const user = this.getUserById(userId);
    if (!user) return;

    // Get user's completed transactions
    const completedTransactions = this.getTransactions().filter(
      t => (t.buyerId === userId || t.sellerId === userId) && t.status === 'completed'
    );

    // Calculate total balance (sum of all completed transactions where user was buyer)
    const totalBalance = completedTransactions.reduce((sum, t) => {
      if (t.buyerId === userId) {
        return sum + t.amount; // User spent this amount
      }
      return sum;
    }, 0);

    // Calculate trust score (0-100)
    // Base score: 0
    // +10 for first completed transaction
    // +5 for each additional completed transaction (max 40 points from transactions)
    // +1 point per $100 spent (max 50 points from balance)
    let trustScore = 0;
    const transactionCount = completedTransactions.length;
    
    if (transactionCount > 0) {
      trustScore += 10; // First transaction bonus
      trustScore += Math.min((transactionCount - 1) * 5, 40); // Additional transactions (max 40 more points)
    }
    
    const balancePoints = Math.min(Math.floor(totalBalance / 100), 50); // $100 = 1 point, max 50 points
    trustScore += balancePoints;
    
    // Cap at 100
    trustScore = Math.min(trustScore, 100);

    // Update user
    this.updateUser(userId, {
      balance: totalBalance,
      trustScore: trustScore,
    });
    
    console.log(`[DB] Updated user ${userId} trust: ${trustScore}, balance: ${totalBalance}`);
  }

  // Calculate user balance from completed transactions
  getUserBalance(userId: string): number {
    const transactions = this.getTransactions();
    // Sum all completed transactions where user was the buyer (money spent)
    const balance = transactions
      .filter(t => t.buyerId === userId && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    return balance;
  }

  getRecentDeposits(userId: string, hours: number = 24): number {
    // Count deposits (completed transactions) in the last N hours
    const transactions = this.getTransactions();
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    return transactions.filter(t => {
      if (t.buyerId !== userId || t.status !== 'completed') return false;
      const txDate = new Date(t.confirmedAt || t.createdAt);
      return txDate >= cutoffTime;
    }).length;
  }

  // Item Messages (for item delivery notifications)
  getItemMessages(): ItemMessage[] {
    return this.readFile(this.itemMessagesFile, []);
  }

  getUserItemMessages(userId: string): ItemMessage[] {
    return this.getItemMessages().filter(m => m.buyerId === userId);
  }

  createItemMessage(message: ItemMessage): void {
    const messages = this.getItemMessages();
    messages.push(message);
    this.writeFile(this.itemMessagesFile, messages);
  }

  markItemMessageAsRead(messageId: string): boolean {
    const messages = this.getItemMessages();
    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) return false;
    messages[index].isRead = true;
    this.writeFile(this.itemMessagesFile, messages);
    return true;
  }

  // Wallet Configuration
  getWalletConfig(): WalletConfig {
    return this.readFile(this.walletsFile, {});
  }

  updateWalletConfig(config: Partial<WalletConfig>): void {
    const current = this.getWalletConfig();
    this.writeFile(this.walletsFile, { ...current, ...config });
  }
}

// Lazy load PostgreSQL adapter
let dbPostgres: any = null;
if (USE_POSTGRES) {
  try {
    const { dbPostgres: pg } = require('./db-postgres');
    dbPostgres = pg;
  } catch (error) {
    console.error('[DB] Failed to load PostgreSQL adapter:', error);
  }
}

// Create a wrapper that normalizes both sync and async operations
class DatabaseWrapper {
  private backend: any;
  private isAsync: boolean;

  constructor(backend: any, isAsync: boolean) {
    this.backend = backend;
    this.isAsync = isAsync;
  }

  // User methods
  async createUser(user: User): Promise<void> {
    if (this.isAsync) {
      return await this.backend.createUser(user);
    } else {
      this.backend.createUser(user);
    }
  }

  async getUser(id: string): Promise<User | null> {
    if (this.isAsync) {
      return await this.backend.getUser(id);
    } else {
      return this.backend.getUser(id);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (this.isAsync) {
      return await this.backend.getUserByEmail(email);
    } else {
      return this.backend.getUserByEmail(email);
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (this.isAsync) {
      return await this.backend.getUserByUsername(username);
    } else {
      return this.backend.getUserByUsername(username);
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (this.isAsync) {
      return await this.backend.getAllUsers();
    } else {
      return this.backend.getAllUsers();
    }
  }

  async updateUser(id: string, user: Partial<User>): Promise<void> {
    if (this.isAsync) {
      return await this.backend.updateUser(id, user);
    } else {
      this.backend.updateUser(id, user);
    }
  }

  async deleteUser(id: string): Promise<void> {
    if (this.isAsync) {
      return await this.backend.deleteUser(id);
    } else {
      this.backend.deleteUser(id);
    }
  }

  // Product methods
  async createProduct(product: Product): Promise<void> {
    if (this.isAsync) {
      return await this.backend.createProduct(product);
    } else {
      this.backend.createProduct(product);
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    if (this.isAsync) {
      return await this.backend.getProduct(id);
    } else {
      return this.backend.getProduct(id);
    }
  }

  async getAllProducts(): Promise<Product[]> {
    if (this.isAsync) {
      return await this.backend.getAllProducts();
    } else {
      return this.backend.getProducts();
    }
  }

  // For backward compatibility
  getProducts(): Product[] {
    if (this.isAsync) {
      throw new Error('Use getAllProducts() instead');
    }
    return this.backend.getProducts();
  }

  getProductById(id: string): Product | undefined {
    if (this.isAsync) {
      throw new Error('Use getProduct() instead');
    }
    return this.backend.getProductById(id);
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<boolean> {
    if (this.isAsync) {
      await this.backend.updateProduct(id, product);
      return true;
    } else {
      return this.backend.updateProduct(id, product);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    if (this.isAsync) {
      return await this.backend.deleteProduct(id);
    } else {
      this.backend.deleteProduct(id);
    }
  }

  // Transaction methods
  async createTransaction(transaction: Transaction): Promise<void> {
    if (this.isAsync) {
      return await this.backend.createTransaction(transaction);
    } else {
      this.backend.createTransaction(transaction);
    }
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    if (this.isAsync) {
      return await this.backend.getTransaction(id);
    } else {
      return this.backend.getTransaction(id);
    }
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    if (this.isAsync) {
      return await this.backend.getTransactionsByUser(userId);
    } else {
      return this.backend.getTransactionsByUser(userId);
    }
  }

  // Alias for compatibility
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return this.getTransactionsByUser(userId);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    if (this.isAsync) {
      return await this.backend.getAllTransactions();
    } else {
      return this.backend.getAllTransactions();
    }
  }

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<void> {
    if (this.isAsync) {
      return await this.backend.updateTransaction(id, transaction);
    } else {
      this.backend.updateTransaction(id, transaction);
    }
  }

  // ItemMessage methods
  async createItemMessage(message: ItemMessage): Promise<void> {
    if (this.isAsync) {
      return await this.backend.createItemMessage(message);
    } else {
      this.backend.createItemMessage(message);
    }
  }

  async getItemMessages(receiverId: string): Promise<ItemMessage[]> {
    if (this.isAsync) {
      return await this.backend.getItemMessages(receiverId);
    } else {
      return this.backend.getItemMessages(receiverId);
    }
  }

  async getItemMessage(id: string): Promise<ItemMessage | null> {
    if (this.isAsync) {
      return await this.backend.getItemMessage(id);
    } else {
      return this.backend.getItemMessage(id);
    }
  }

  async deleteItemMessage(id: string): Promise<void> {
    if (this.isAsync) {
      return await this.backend.deleteItemMessage(id);
    } else {
      this.backend.deleteItemMessage(id);
    }
  }

  // Wallet methods
  async createWallet(wallet: any): Promise<void> {
    if (this.isAsync) {
      return await this.backend.createWallet(wallet);
    } else {
      this.backend.createWallet(wallet);
    }
  }

  async getWallet(userId: string): Promise<any> {
    if (this.isAsync) {
      return await this.backend.getWallet(userId);
    } else {
      return this.backend.getWallet(userId);
    }
  }

  async updateWallet(userId: string, wallet: any): Promise<void> {
    if (this.isAsync) {
      return await this.backend.updateWallet(userId, wallet);
    } else {
      this.backend.updateWallet(userId, wallet);
    }
  }

  async getWalletByAddress(address: string): Promise<any> {
    if (this.isAsync) {
      return await this.backend.getWalletByAddress(address);
    } else {
      return this.backend.getWalletByAddress(address);
    }
  }

  async getAllWallets(): Promise<any[]> {
    if (this.isAsync) {
      return await this.backend.getAllWallets();
    } else {
      return this.backend.getAllWallets();
    }
  }

  // Wallet config
  async getWalletConfig(): Promise<WalletConfig> {
    if (this.isAsync) {
      return await this.backend.getWalletConfig();
    } else {
      return this.backend.getWalletConfig();
    }
  }

  async updateWalletConfig(config: Partial<WalletConfig>): Promise<void> {
    if (this.isAsync) {
      return await this.backend.updateWalletConfig(config);
    } else {
      this.backend.updateWalletConfig(config);
    }
  }

  // Additional query methods
  async getUserById(id: string): Promise<any | null> {
    if (this.isAsync) {
      return await this.backend.getUserById(id);
    } else {
      return this.backend.getUserById(id);
    }
  }

  async getTransactionById(id: string): Promise<any | null> {
    if (this.isAsync) {
      return await this.backend.getTransactionById(id);
    } else {
      return this.backend.getTransactionById(id);
    }
  }

  async getTransactions(): Promise<any[]> {
    if (this.isAsync) {
      return await this.backend.getTransactions();
    } else {
      return this.backend.getTransactions();
    }
  }

  async getUserItemMessages(userId: string): Promise<any[]> {
    if (this.isAsync) {
      return await this.backend.getUserItemMessages(userId);
    } else {
      return this.backend.getUserItemMessages(userId);
    }
  }

  async markItemMessageAsRead(messageId: string): Promise<boolean> {
    if (this.isAsync) {
      return await this.backend.markItemMessageAsRead(messageId);
    } else {
      return this.backend.markItemMessageAsRead(messageId);
    }
  }

  async getUserBalance(userId: string): Promise<number> {
    if (this.isAsync) {
      return await this.backend.getUserBalance(userId);
    } else {
      return this.backend.getUserBalance(userId);
    }
  }

  async getRecentDeposits(userId: string, hours: number = 24): Promise<number> {
    if (this.isAsync) {
      return await this.backend.getRecentDeposits(userId, hours);
    } else {
      return this.backend.getRecentDeposits(userId, hours);
    }
  }

  async getRegions(): Promise<string[]> {
    if (this.isAsync) {
      return await this.backend.getRegions();
    } else {
      return this.backend.getRegions();
    }
  }

  async getTypes(): Promise<string[]> {
    if (this.isAsync) {
      return await this.backend.getTypes();
    } else {
      return this.backend.getTypes();
    }
  }

  async getSizes(): Promise<string[]> {
    if (this.isAsync) {
      return await this.backend.getSizes();
    } else {
      return this.backend.getSizes();
    }
  }
}

// Create database instance with appropriate backend
const jsonDb = new Database();
const backend = USE_POSTGRES && dbPostgres ? dbPostgres : jsonDb;
export const db = new DatabaseWrapper(backend, USE_POSTGRES && dbPostgres ? true : false);

export type { User, Product, Transaction, WalletConfig, ItemMessage };

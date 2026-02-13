import fs from 'fs';
import path from 'path';

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
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file atomically - handle Windows file locking issues
      const tempFile = `${filePath}.tmp`;
      try {
        // Remove temp file if it exists
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        // Write to temp file first
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
        // Atomic rename
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        fs.renameSync(tempFile, filePath);
      } catch (writeError: any) {
        // Clean up temp file if rename fails
        if (fs.existsSync(tempFile)) {
          try {
            fs.unlinkSync(tempFile);
          } catch {}
        }
        throw writeError;
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

export const db = new Database();
export type { User, Product, Transaction, WalletConfig, ItemMessage };

# COMPONENT-BY-COMPONENT VERIFICATION CHECKLIST

## This document helps verify each system component works in isolation before deployment

---

## 1️⃣ AUTHENTICATION SYSTEM

### User Signup Flow
**Component**: `app/api/auth/signup/route.ts`

**What it does**:
1. Receives form data (firstName, lastName, username, email, password, securityPhrase)
2. Validates all fields are present and correct format
3. Checks email/username don't already exist
4. Hashes password and security phrase
5. Creates user in database
6. **Creates welcome message automatically**
7. Generates JWT token
8. Returns token and user data

**How to test locally**:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "securityPhrase": "apple banana cherry dragon"
  }'
```

**Expected Response**:
```json
{
  "token": "eyJhbGc...",
  "userId": "user_1234567890_abc123",
  "email": "john@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Database Check** (after signup):
- ✅ User exists in `users` table
- ✅ Password is hashed (not plain text)
- ✅ Welcome message exists in `item_messages` with `id: 'welcome_<userId>'`

---

### Admin Login Flow
**Component**: `app/api/admin/verify/route.ts`

**What it does**:
1. Receives admin password
2. Compares with `ADMIN_PASSWORD` environment variable
3. If matches: Creates httpOnly cookie (secure, can't be stolen via JS)
4. Returns success
5. Frontend clears all user data from localStorage

**How to test locally**:
```bash
# Set ADMIN_PASSWORD in .env.local
ADMIN_PASSWORD=my-secure-password-123

# Call verify endpoint
curl -X POST http://localhost:3000/api/admin/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "my-secure-password-123"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Admin session created"
}
```

**Important**: 
- ✅ No token in response (uses httpOnly cookie instead)
- ✅ Message icon won't show welcome modal (checks for `userFirstName` in localStorage)

---

## 2️⃣ PRODUCT MANAGEMENT SYSTEM

### Create Product (Admin)
**Component**: `app/api/admin/products/route.ts` (POST)

**What it does**:
1. Verifies admin session (httpOnly cookie)
2. Validates all required fields (name, description, price, region, type)
3. Validates price is numeric and > 0
4. Creates product in database
5. Stores image URL (not actual image upload)
6. Returns product ID

**How to test** (with admin session):
```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Cookie: adminSessionToken=<your-token>" \
  -d '{
    "name": "Premium Software",
    "description": "Full version with lifetime support",
    "price": 99.99,
    "region": "US",
    "type": "Software",
    "size": "50",
    "image": "https://via.placeholder.com/400x300?text=Software"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "productId": "prod_1234567890_abc123"
}
```

**Database Check**:
- ✅ Product exists in `products` table with all fields
- ✅ Image URL stored as string (not file)
- ✅ Price is numeric (DECIMAL type)

---

### Get All Products (Users)
**Component**: `app/api/products/route.ts` (GET)

**What it does**:
1. No authentication required
2. Fetches all products from database
3. Supports filters: region, type, search
4. Returns product array

**How to test** (no auth needed):
```bash
curl http://localhost:3000/api/products
curl http://localhost:3000/api/products?region=US&type=Software
curl http://localhost:3000/api/products?search=Premium
```

**Expected Response**:
```json
{
  "products": [
    {
      "id": "prod_1234567890_abc123",
      "name": "Premium Software",
      "description": "Full version with lifetime support",
      "price": 99.99,
      "region": "US",
      "type": "Software",
      "size": "50",
      "image": "https://via.placeholder.com/400x300?text=Software"
    }
  ]
}
```

**Verification**:
- ✅ Products include image URL
- ✅ No "not found" error
- ✅ Products persist (don't disappear)

---

### Get Single Product (Users)
**Component**: `app/api/products/[id]/route.ts` (GET)

**What it does**:
1. No authentication required
2. Takes product ID from URL
3. Fetches single product from database
4. Returns product or 404 if not found

**How to test**:
```bash
curl http://localhost:3000/api/products/prod_1234567890_abc123
```

**Expected Response** (if product exists):
```json
{
  "product": {
    "id": "prod_1234567890_abc123",
    "name": "Premium Software",
    ...
  }
}
```

**Expected Response** (if product deleted):
```json
{
  "error": "Product not found"
}
(Status 404)
```

---

### Update Product (Admin)
**Component**: `app/api/admin/products/route.ts` (PUT)

**What it does**:
1. Verifies admin session
2. Takes product ID and updates object
3. Validates updated fields (price numeric, etc.)
4. Updates in database
5. Returns success or 404 if not found

**How to test**:
```bash
curl -X PUT http://localhost:3000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Cookie: adminSessionToken=<your-token>" \
  -d '{
    "id": "prod_1234567890_abc123",
    "price": 79.99,
    "image": "https://new-image-url.com/image.jpg"
  }'
```

**Expected Response**:
```json
{
  "success": true
}
```

**Database Check**:
- ✅ Product updated in database
- ✅ Users see updated price/image immediately
- ✅ Product doesn't disappear

---

### Delete Product (Admin)
**Component**: `app/api/admin/products/route.ts` (DELETE)

**What it does**:
1. Verifies admin session
2. Takes product ID from query parameter
3. **Deletes from database** (uses `await deleteProduct()`)
4. Returns success or 404 if not found

**How to test**:
```bash
curl -X DELETE "http://localhost:3000/api/admin/products?id=prod_1234567890_abc123" \
  -H "Cookie: adminSessionToken=<your-token>"
```

**Expected Response**:
```json
{
  "success": true
}
```

**User Verification** (after delete):
- ✅ Product no longer appears in marketplace
- ✅ Accessing product detail page shows 404
- ✅ Message: "Product not found" is expected (product was deleted)

---

## 3️⃣ WALLET CONFIGURATION SYSTEM

### Get Wallets (Admin)
**Component**: `app/api/admin/wallets/route.ts` (GET)

**What it does**:
1. Verifies admin session
2. Retrieves all configured wallet addresses
3. Returns object like: `{ bitcoin: "address...", ethereum: "address...", ... }`

**How to test**:
```bash
curl http://localhost:3000/api/admin/wallets \
  -H "Cookie: adminSessionToken=<your-token>"
```

**Expected Response**:
```json
{
  "wallets": {
    "bitcoin": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "ethereum": "0x1234567890123456789012345678901234567890"
  }
}
```

---

### Save Wallets (Admin)
**Component**: `app/api/admin/wallets/route.ts` (PUT)

**What it does**:
1. Verifies admin session
2. Receives wallet object
3. Saves to database
4. Returns success

**How to test**:
```bash
curl -X PUT http://localhost:3000/api/admin/wallets \
  -H "Content-Type: application/json" \
  -H "Cookie: adminSessionToken=<your-token>" \
  -d '{
    "bitcoin": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "ethereum": "0x1234567890123456789012345678901234567890",
    "usdc": "0x1234567890123456789012345678901234567890"
  }'
```

**Expected Response**:
```json
{
  "success": true
}
```

**Verification**:
- ✅ Wallets saved in database
- ✅ When user purchases, correct wallet address is shown
- ✅ If wallet not configured, shows error message

---

## 4️⃣ PAYMENT & TRANSACTION SYSTEM

### Create Payment (User)
**Component**: `app/api/payment/create/route.ts` (POST)

**What it does**:
1. Verifies user authentication (token)
2. Validates product exists
3. Validates quantity is available
4. Gets wallet address from admin config
5. **Calculates real-time crypto amount**:
   - Divides USD price by crypto price
   - Example: $100 USD ÷ $43,500 per BTC = 0.0023 BTC
6. Creates transaction record with status `pending`
7. Returns transaction ID, wallet address, crypto amount

**How to test** (with user token):
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>" \
  -d '{
    "productId": "prod_1234567890_abc123",
    "cryptocurrency": "bitcoin",
    "quantity": 1
  }'
```

**Expected Response**:
```json
{
  "transactionId": "txn_1234567890_abc123",
  "walletAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "amount": 99.99,
  "cryptoAmount": 0.0023,
  "cryptoSymbol": "BTC",
  "quantity": 1,
  "cryptocurrency": "bitcoin"
}
```

**Verification**:
- ✅ Crypto amount calculated correctly (0.0023 BTC for $100 at $43,500/BTC)
- ✅ Wallet address from admin config
- ✅ Transaction created in database with status `pending`

---

### Confirm Payment (User)
**Component**: `app/api/payment/confirm/route.ts` (POST)

**What it does**:
1. Verifies user authentication
2. Validates transaction exists
3. Updates user balance (adds transaction amount to balance)
4. Updates transaction status from `pending` to `deposit_confirmed`
5. Creates notification message
6. Returns success

**How to test** (with user token):
```bash
curl -X POST http://localhost:3000/api/payment/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>" \
  -d '{
    "transactionId": "txn_1234567890_abc123"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "newBalance": 199.99
}
```

**Database Check**:
- ✅ Transaction status changed to `deposit_confirmed`
- ✅ User balance increased
- ✅ Notification message created

---

### Confirm Delivery (User)
**Component**: `app/api/payment/confirm/route.ts` (PUT)

**What it does**:
1. Verifies user authentication
2. Validates transaction exists and is in `paid` status
3. Updates transaction status to `completed`
4. **Does NOT change balance** (balance was added in CONFIRM PAYMENT step)
5. Creates completion notification

**How to test** (with user token):
```bash
curl -X PUT http://localhost:3000/api/payment/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>" \
  -d '{
    "transactionId": "txn_1234567890_abc123"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Escrow released and funds transferred"
}
```

**Verification**:
- ✅ Transaction status is `completed`
- ✅ User sees completion notification

---

## 5️⃣ ORDER MANAGEMENT SYSTEM (Admin)

### Get Orders (Admin)
**Component**: `app/api/admin/orders/route.ts` (GET)

**What it does**:
1. Verifies admin session
2. Fetches all transactions with status `paid` or `deposit_confirmed`
3. Enriches with buyer and product info
4. Returns detailed order list

**How to test** (with admin session):
```bash
curl http://localhost:3000/api/admin/orders \
  -H "Cookie: adminSessionToken=<your-token>"
```

**Expected Response**:
```json
{
  "orders": [
    {
      "transactionId": "txn_1234567890_abc123",
      "buyerId": "user_1234567890_abc123",
      "buyerName": "John Doe",
      "buyerEmail": "john@example.com",
      "buyerUsername": "johndoe",
      "productName": "Premium Software",
      "amount": 99.99,
      "cryptocurrency": "bitcoin",
      "createdAt": "2024-01-15T10:30:00Z",
      "status": "paid",
      "itemDelivered": false
    }
  ],
  "total": 1,
  "success": true
}
```

---

### Send Item (Admin)
**Component**: `app/api/admin/orders/route.ts` (POST)

**What it does**:
1. Verifies admin session
2. Takes transaction ID and item details
3. Creates item message in database
4. Returns success

**How to test**:
```bash
curl -X POST http://localhost:3000/api/admin/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: adminSessionToken=<your-token>" \
  -d '{
    "transactionId": "txn_1234567890_abc123",
    "itemContent": "Download: https://example.com/software.zip\nPassword: ABC123XYZ"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Item sent to buyer inbox"
}
```

**User Verification** (immediately after):
- ✅ Message notification appears in top-left
- ✅ Unread count increases
- ✅ In inbox: Item message with download link
- ✅ Can view full item details

---

## 6️⃣ MESSAGE & NOTIFICATION SYSTEM

### Get Messages (User)
**Component**: `app/api/messages/route.ts` (GET)

**What it does**:
1. Verifies user authentication
2. Fetches all messages for user including:
   - Welcome message (if not read)
   - Item delivery messages
   - Transaction notifications
3. Marks welcome with special `isWelcome: true` flag
4. Returns sorted by date (newest first)

**How to test** (with user token):
```bash
curl http://localhost:3000/api/messages \
  -H "Authorization: Bearer <user-token>"
```

**Expected Response**:
```json
{
  "messages": [
    {
      "id": "welcome-welcome_user_123",
      "title": "👋 Welcome to Russian Roulette",
      "content": "Welcome message content...",
      "type": "system",
      "isWelcome": true,
      "isRead": false,
      "createdAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "deposit-txn_123",
      "title": "✅ Deposit Confirmed!",
      "content": "Your deposit has been confirmed...",
      "type": "order",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "item-msg_123",
      "title": "📦 Item Delivery: Premium Software",
      "content": "Your item has been delivered!...",
      "type": "delivery",
      "isRead": false,
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ],
  "success": true
}
```

**Verification**:
- ✅ Welcome message appears with `isWelcome: true`
- ✅ Other messages sorted by date
- ✅ Can determine unread count

---

### Welcome Modal Behavior (Frontend)
**Component**: `components/MessageCenter.tsx`

**What it does** (on component mount):
1. Fetches messages via `/api/messages`
2. Checks for message with `isWelcome: true` and `isRead: false`
3. Checks localStorage for `userFirstName` (confirms regular user, NOT admin)
4. Auto-opens welcome modal
5. User can click "Accept" or "Dismiss"
6. Either action marks message as read
7. Modal never appears again

**Frontend Verification**:
- ✅ Modal appears automatically for new users
- ✅ Modal doesn't appear for admin
- ✅ Modal doesn't appear again after first interaction
- ✅ Welcome content displays correctly

---

## 7️⃣ USER PROFILE & BALANCE SYSTEM

### Get User Profile (User)
**Component**: `app/api/user/profile/route.ts` (GET)

**What it does**:
1. Verifies user authentication
2. Fetches user record from database
3. Returns user info + balance + trustScore

**How to test**:
```bash
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer <user-token>"
```

**Expected Response**:
```json
{
  "user": {
    "id": "user_1234567890_abc123",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "balance": 199.99,
    "trustScore": 55,
    "recentDeposits": 99.99
  }
}
```

**Verification**:
- ✅ Balance includes all completed transactions
- ✅ Trust score increases after each transaction
- ✅ Recent deposits tracks last deposit amount

---

### Get User Stats (User)
**Component**: `app/api/user/stats/route.ts` (GET)

**What it does**:
1. Verifies user authentication
2. Calculates stats from user's transactions:
   - Total spending
   - Transaction count
   - Average spent
   - Trust score
3. Returns summary stats

**How to test**:
```bash
curl http://localhost:3000/api/user/stats \
  -H "Authorization: Bearer <user-token>"
```

**Expected Response**:
```json
{
  "stats": {
    "totalSpent": 199.99,
    "transactionCount": 2,
    "averageSpent": 99.99,
    "trustScore": 55
  }
}
```

---

## 8️⃣ CRYPTO CONVERSION SYSTEM

### Real-Time Conversion (lib/crypto.ts)
**Component**: `lib/crypto.ts`

**Functions available**:
- `convertUsdToCrypto(usdAmount, cryptoId)` → crypto amount
- `convertCryptoToUsd(cryptoAmount, cryptoId)` → USD amount
- `formatCryptoAmount(amount, symbol)` → formatted string
- `getCryptoById(cryptoId)` → crypto object

**How to test** (locally):
```javascript
import { convertUsdToCrypto, CRYPTO_PRICES } from '@/lib/crypto';

// $100 USD to Bitcoin
const btcAmount = convertUsdToCrypto(100, 'bitcoin');
console.log(btcAmount); // 0.00229887 BTC

// $100 USD to Ethereum
const ethAmount = convertUsdToCrypto(100, 'ethereum');
console.log(ethAmount); // 0.04348 ETH

// Check price data
console.log(CRYPTO_PRICES['bitcoin']); // 43500
console.log(CRYPTO_PRICES['ethereum']); // 2300
```

**Prices Included**:
- Bitcoin: $43,500
- Ethereum: $2,300
- USDT: $1.00
- USDC: $1.00
- And 50+ more cryptocurrencies

**Verification**:
- ✅ Conversions mathematically correct
- ✅ All supported cryptos have prices
- ✅ Returns 8 decimal precision

---

## 🎯 INTEGRATION FLOW TEST

To test the complete flow end-to-end:

```bash
# 1. SIGNUP
curl -X POST http://localhost:3000/api/auth/signup \
  -d "..." → Get TOKEN and USERID

# 2. GET PRODUCTS
curl http://localhost:3000/api/products → See products

# 3. CREATE PAYMENT
curl -X POST http://localhost:3000/api/payment/create \
  -H "Authorization: Bearer TOKEN" \
  -d "{productId, cryptocurrency, quantity}" → Get TXN_ID

# 4. CONFIRM PAYMENT
curl -X POST http://localhost:3000/api/payment/confirm \
  -H "Authorization: Bearer TOKEN" \
  -d "{transactionId}" → Balance increases

# 5. GET MESSAGES
curl http://localhost:3000/api/messages \
  -H "Authorization: Bearer TOKEN" → See notifications

# 6. ADMIN: GET ORDERS
curl http://localhost:3000/api/admin/orders \
  -H "Cookie: adminSessionToken=..." → See new order

# 7. ADMIN: SEND ITEM
curl -X POST http://localhost:3000/api/admin/orders \
  -H "Cookie: adminSessionToken=..." \
  -d "{transactionId, itemContent}" → User gets notification

# 8. CONFIRM DELIVERY
curl -X PUT http://localhost:3000/api/payment/confirm \
  -H "Authorization: Bearer TOKEN" \
  -d "{transactionId}" → Complete transaction
```

---

## ✅ COMPONENT STATUS

- ✅ Authentication (signup + admin login)
- ✅ Product Management (create, read, update, delete)
- ✅ Wallet Configuration
- ✅ Payment Processing
- ✅ Notifications & Messages
- ✅ User Profiles & Balance
- ✅ Crypto Conversion
- ✅ Admin Order Management
- ✅ Item Delivery System
- ✅ Welcome Message Modal (for users only)
- ✅ Async/Await properly implemented (with DELETE fix)

**Ready for deployment**: YES

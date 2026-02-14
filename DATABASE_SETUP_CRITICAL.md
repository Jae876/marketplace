# 🚨 CRITICAL: Database URL Setup for Data Persistence

## THE PROBLEM
Your data disappears on every page refresh because **DATABASE_URL is not configured** on Vercel.

**What's happening:**
- ✅ Code correctly checks for `process.env.DATABASE_URL`
- ✅ PostgreSQL adapter (`lib/db-postgres.ts`) is ready
- ❌ **DATABASE_URL is NOT set in Vercel environment**
- ❌ Falls back to JSON file storage in `/tmp/data` 
- ❌ `/tmp` is ephemeral on Vercel (wiped on every restart/deploy)
- ❌ Data lost forever on refresh

---

## HOW TO FIX (FOLLOW EXACTLY)

### Step 1: Get Your Database Connection String

You need a PostgreSQL database. Choose ONE:

#### Option A: Neon (Recommended - Free tier)
1. Go to https://console.neon.tech
2. Create account
3. Create a new project
4. Copy the connection string (looks like: `postgresql://user:password@host/database`)

#### Option B: Any Other PostgreSQL Provider
- Render (https://render.com)
- Railway (https://railway.app)
- Vercel Postgres (https://vercel.com/storage/postgres)

**Important:** Connection string format: `postgresql://username:password@host:5432/database`

---

### Step 2: Add DATABASE_URL to Vercel

1. Go to **https://vercel.com/dashboard**
2. Select your **marketplace** project
3. Click **Settings** → **Environment Variables**
4. Click **Add New**
   - **Name:** `DATABASE_URL`
   - **Value:** Paste your PostgreSQL connection string
   - **Environments:** Select `Production` (and `Preview` and `Development` if you want)
5. Click **Save**
6. Click **Deploy** to redeploy with the new environment variable

---

### Step 3: Verify It Works

1. Go to your Vercel deployment
2. Sign up as a new user
3. **IMPORTANT:** Wait 5 seconds (let database initialize)
4. Refresh the page
5. Check that your balance badge, message icon, and welcome modal still appear
6. Refresh again - data should persist
7. Logout and login - data should persist

---

## WHAT EACH COMPONENT NEEDS

### ✅ BalanceBadge
- **Location:** Navbar (dashboard)
- **Data:** Gets balance from `/api/user/profile` → database
- **Status:** Now renders when `DATABASE_URL` is set

### ✅ MessageCenter (Message Icon)
- **Location:** Navbar (dashboard)
- **Shows:** Notification count + message dropdown
- **Data:** Gets messages from `/api/messages` → database
- **Welcome Modal:** Auto-opens when new user has unread welcome message
- **Status:** Now renders when `DATABASE_URL` is set

### ✅ Release Funds Button
- **Location:** Item delivery messages in UserInbox
- **Action:** Calls `PUT /api/payment/confirm` with transactionId
- **Updates:** User balance, marks transaction as completed
- **Status:** Implemented and ready

---

## DATABASE INITIALIZATION

When `DATABASE_URL` is set and first request hits the API:

1. PostgreSQL backend connects via pool
2. Tables auto-create if they don't exist:
   - `users` table
   - `products` table
   - `transactions` table
   - `item_messages` table
   - `wallets` table
3. Your data persists forever (or until you delete the database)

---

## QUICK CHECKLIST

- [ ] Got PostgreSQL connection string from Neon/Railway/etc
- [ ] Pasted DATABASE_URL into Vercel Environment Variables
- [ ] Set it for Production environment
- [ ] Redeployed project on Vercel (or just waited for auto-deploy)
- [ ] Signed up new user
- [ ] Refreshed page - still see balance badge ✅
- [ ] Refreshed page - still see message icon ✅
- [ ] Still see welcome modal on first signup ✅
- [ ] Made a transaction - released funds
- [ ] Refreshed - balance persisted ✅

---

## IF DATA STILL DISAPPEARS

1. Check Vercel logs: **Settings → Functions → Logs**
2. Look for "DATABASE_URL" errors
3. Verify DATABASE_URL value is exactly correct (no spaces, full string)
4. Verify database is running (test connection in Neon/Railway dashboard)
5. Restart your database connection pool (redeploy once more)

---

## PRODUCTION CHECKLIST

✅ DATABASE_URL set in Vercel Environment Variables  
✅ Build compiles without errors (`npm run build` passes)  
✅ Deployed to Vercel (not localhost)  
✅ Components render (BalanceBadge, MessageCenter visible)  
✅ Data persists on page refresh  
✅ Admin can CRUD products  
✅ Users can purchase products  
✅ Transactions complete → funds released → balances update  
✅ Welcome message shows on signup  

---

**DO NOT DEPLOY AGAIN UNTIL DATABASE_URL IS SET.**

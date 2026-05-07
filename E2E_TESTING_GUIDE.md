# End-to-End Testing Guide: External Products Sync → Render → Purchase Flow

## Overview
This guide provides comprehensive testing procedures for validating the complete external product integration, from syncing products from theowlet.store to final purchase through the escrow system.

## Pre-Testing Checklist
- [ ] Database connection verified (PostgreSQL/Neon)
- [ ] All environment variables set (DATABASE_URL, API keys)
- [ ] Admin credentials configured
- [ ] Wallet addresses configured in admin panel
- [ ] Test user account created with sufficient balance
- [ ] Dev/staging deployment accessible

---

## Test Suite 1: Product Syncing

### Test 1.1: Manual Sync Trigger
**Objective:** Verify admin can manually trigger product sync from theowlet.store

**Steps:**
1. Navigate to Admin Panel (`/admin`)
2. Login with admin credentials
3. Click "🔗 External Products" tab
4. Click "🔄 Sync Products from theowlet.store" button
5. Wait for completion

**Expected Results:**
- ✓ Button shows "⏳ Syncing..." during operation
- ✓ Button returns to normal state after completion
- ✓ Success message displays: "✓ Synced [N] products from theowlet.store"
- ✓ Products appear in the External Products table
- ✓ Table shows: Name, Price ($), Type, Region, Edited status
- ✓ Network tab shows POST to `/api/admin/sync-external-products`

**Pass/Fail:** ___

**Notes:**

---

### Test 1.2: Verify Synced Product Data
**Objective:** Confirm product details are correctly extracted and stored

**Steps:**
1. After sync completes, examine products in External Products table
2. Click "Edit" on one synced product

**Expected Results:**
- ✓ Edit modal opens showing full product details
- ✓ Modal displays: Name, Description, Current Price, Region, Type, Size, Image URL
- ✓ "Custom Edit" indicator shows "No" for newly synced products
- ✓ Original prices match theowlet.store pricing
- ✓ Regions auto-categorized (usa, uk, eu, asia, global)
- ✓ Types auto-categorized (software, course, ebook, service, media, digital)
- ✓ Images render correctly

**Pass/Fail:** ___

**Notes:**

---

## Test Suite 2: Product Editing & Persistence

### Test 2.1: Edit External Product
**Objective:** Verify admin can edit synced products and changes persist

**Steps:**
1. Open External Products tab in Admin Panel
2. Click "Edit" on a synced product
3. Modify: Name, Price, and Description
4. Click "Save Changes"
5. Verify product appears in updated list

**Expected Results:**
- ✓ Modal closes after save
- ✓ Success message displays: "✓ Product updated"
- ✓ Product table refreshes automatically
- ✓ "Edited" column shows "✓ Yes" in yellow
- ✓ Network tab shows PUT to `/api/admin/external-products/[id]`
- ✓ Response includes updated fields and editedFields metadata

**Pass/Fail:** ___

**Notes:**

---

### Test 2.2: Edit Preservation on Re-sync
**Objective:** Confirm admin edits survive subsequent sync operations

**Steps:**
1. Edit a product (change price to non-original value)
2. Note the product's current status shows "✓ Yes" in Edited column
3. Trigger manual sync again
4. Verify product still shows edited changes

**Expected Results:**
- ✓ Product marked as "Edited" before and after sync
- ✓ Edited price retained after sync (not overwritten by source)
- ✓ Only unedited fields updated from source on sync
- ✓ editedFields JSONB tracks which fields were customized
- ✓ Product retains admin-set values across sync operations

**Pass/Fail:** ___

**Notes:**

---

## Test Suite 3: Main Page Rendering

### Test 3.1: External Products Visible to Users
**Objective:** Verify synced products display on main marketplace

**Steps:**
1. Logout from admin panel
2. Navigate to home page (`/`)
3. Scroll through product grid
4. Search for a synced product by name
5. Click on synced product card

**Expected Results:**
- ✓ Synced products appear in product grid alongside internal products
- ✓ Products display: Image, Name, Description, Price (in $), Region tag, Type tag
- ✓ Product card shows correct pricing (admin edits reflected)
- ✓ Search finds synced products by name, description, region, or type
- ✓ Clicking product navigates to product detail page
- ✓ No console errors or broken images

**Pass/Fail:** ___

**Notes:**

---

### Test 3.2: Dark Mode Toggle Functionality
**Objective:** Verify dark/light mode toggle works without breaking layout

**Steps:**
1. Navigate to home page (`/`)
2. Note current theme (should default to dark)
3. Click sun/moon icon in top-right navbar
4. Verify theme changes to light mode
5. Refresh page and verify preference persists
6. Toggle back to dark mode
7. Verify all UI elements remain functional

**Expected Results:**
- ✓ Light mode: White background, dark text, blue accents
- ✓ Dark mode: Dark background, light text, purple accents
- ✓ Toggle button icon changes (☀️ ↔️ 🌙)
- ✓ Theme preference saved to localStorage
- ✓ Theme persists across page refreshes
- ✓ All text readable in both modes
- ✓ Button hover states work in both modes
- ✓ Product cards visible and styled correctly in both modes
- ✓ Footer text contrast acceptable in both modes
- ✓ Navigation links functional in both modes

**Pass/Fail:** ___

**Notes:**

---

## Test Suite 4: Product Purchase Flow (Escrow Integration)

### Test 4.1: Initiate Purchase of Synced Product
**Objective:** Verify purchase flow starts correctly for external products

**Steps:**
1. Login as test user
2. Click on a synced product from main page
3. Verify product details display correctly
4. Select cryptocurrency (e.g., Bitcoin)
5. Click "Buy Now" button

**Expected Results:**
- ✓ Product detail page loads with correct synced product data
- ✓ Price displays in dollars (USD)
- ✓ Price converts correctly to cryptocurrency
- ✓ Crypto dropdown shows available options
- ✓ "Buy Now" button initiates payment creation
- ✓ Navigates to payment confirmation page
- ✓ Payment address displays from configured wallets

**Pass/Fail:** ___

**Notes:**

---

### Test 4.2: Complete Escrow Workflow
**Objective:** Verify full escrow transaction lifecycle (pending → delivered → completed)

**Steps:**
1. Initiate purchase of synced product
2. Copy payment address and confirm transaction details
3. Simulate crypto payment (or submit real test transaction)
4. Verify transaction enters "pending" state
5. As admin, confirm payment received
6. As buyer, confirm receipt
7. Verify transaction completes

**Expected Results:**
- ✓ Payment page shows correct wallet address from configured wallets
- ✓ Transaction created with status: "pending"
- ✓ Buyer sees transaction in Dashboard → Transactions
- ✓ Admin can access Order Management tab
- ✓ Admin confirms payment → Transaction moves to "deposit_confirmed"
- ✓ System sends item details to buyer
- ✓ Buyer confirms receipt → Transaction moves to "completed"
- ✓ Both buyer and seller see transaction history updated
- ✓ Balance adjustments reflected in user profiles
- ✓ No console errors throughout flow

**Pass/Fail:** ___

**Notes:**

---

## Test Suite 5: Existing Functionality Verification

### Test 5.1: Internal Products Still Function
**Objective:** Verify original product functionality not broken

**Steps:**
1. Admin Panel → Products tab
2. Create new internal product
3. Verify product appears on main page
4. Purchase internal product
5. Verify escrow workflow works

**Expected Results:**
- ✓ Can create products in Products tab
- ✓ Internal products display alongside external products
- ✓ Internal product purchases complete successfully
- ✓ No mixing of product sources causes errors
- ✓ All original filtering/search works

**Pass/Fail:** ___

**Notes:**

---

### Test 5.2: Wallet Configuration Persistence
**Objective:** Verify wallet persistence feature still works

**Steps:**
1. Admin Panel → Wallet Addresses tab
2. Configure 2-3 wallet addresses
3. Save configuration
4. Refresh admin panel
5. Verify wallets still configured
6. Logout and login again
7. Verify wallets still present

**Expected Results:**
- ✓ Wallets configured and saved
- ✓ Wallets persist after refresh
- ✓ Wallets persist across login/logout
- ✓ All 70+ wallet slots remain available
- ✓ Purchase transactions use configured wallets

**Pass/Fail:** ___

**Notes:**

---

### Test 5.3: User Authentication & Balance
**Objective:** Verify auth and balance features work

**Steps:**
1. Create new user account via signup
2. Login with new account
3. View balance in navbar (Balance Badge)
4. View full profile in Dashboard
5. Perform transaction
6. Verify balance updated

**Expected Results:**
- ✓ Signup creates account successfully
- ✓ Login works with correct credentials
- ✓ Balance displays in navbar
- ✓ Dashboard shows user details
- ✓ Transaction updates balance correctly
- ✓ Trust score calculated and displayed

**Pass/Fail:** ___

**Notes:**

---

## Test Suite 6: Performance & Edge Cases

### Test 6.1: Bulk Product Handling
**Objective:** Verify system handles large sync operations

**Steps:**
1. Trigger manual sync
2. Monitor time to completion
3. Verify all products load in external products table
4. Scroll through full product list
5. Search within large dataset

**Expected Results:**
- ✓ Sync completes in reasonable time (< 30 seconds)
- ✓ All synced products (100+) load and display
- ✓ Table scroll performance acceptable
- ✓ Search returns results quickly
- ✓ No timeout or memory errors

**Pass/Fail:** ___

**Notes:**

---

### Test 6.2: Image Handling & Fallback
**Objective:** Verify product images display or handle gracefully

**Steps:**
1. View synced products with images on main page
2. View product missing image on main page
3. Check edit modal for products with/without images
4. Update image URL in edit modal (valid and invalid URLs)
5. Verify display handling

**Expected Results:**
- ✓ Valid images display correctly
- ✓ Missing images don't break layout
- ✓ Product card text readable with/without images
- ✓ Edit modal allows image URL changes
- ✓ Invalid URLs fail gracefully

**Pass/Fail:** ___

**Notes:**

---

### Test 6.3: Concurrent Operations
**Objective:** Verify multiple admins don't cause conflicts

**Steps:**
1. Open two admin panel windows
2. Edit same product in both windows
3. Sync in one window while editing in another
4. Edit product that's being synced
5. Observe data consistency

**Expected Results:**
- ✓ Last edit wins (no data loss, but potential conflict)
- ✓ Edited field tracking reflects most recent changes
- ✓ No server-side errors
- ✓ Data eventually consistent after all operations complete

**Pass/Fail:** ___

**Notes:**

---

## Test Suite 7: API Contract Validation

### Test 7.1: GET /api/admin/sync-external-products
**Objective:** Verify external products retrieval endpoint

**Using:** Postman, curl, or browser dev tools

```bash
curl -H "Cookie: admin_token=YOUR_TOKEN" \
  https://your-domain.com/api/admin/sync-external-products
```

**Expected Response:**
```json
{
  "external_products": [
    {
      "id": "string",
      "source": "theowlet.store",
      "sourceId": "string",
      "name": "string",
      "description": "string",
      "originalPrice": number,
      "currentPrice": number,
      "region": "string",
      "type": "string",
      "size": "string",
      "image": "string",
      "isEdited": boolean,
      "editedFields": ["field1", "field2"],
      "lastSynced": "ISO-8601 timestamp",
      "createdAt": "ISO-8601 timestamp"
    }
  ]
}
```

**Pass/Fail:** ___

---

### Test 7.2: POST /api/admin/sync-external-products
**Objective:** Verify sync trigger endpoint

```bash
curl -X POST \
  -H "Cookie: admin_token=YOUR_TOKEN" \
  https://your-domain.com/api/admin/sync-external-products
```

**Expected Response:**
```json
{
  "message": "Successfully synced products from theowlet.store",
  "synced": number,
  "errors": number,
  "total": number
}
```

**Pass/Fail:** ___

---

### Test 7.3: PUT /api/admin/external-products/[id]
**Objective:** Verify product update endpoint

```bash
curl -X PUT \
  -H "Cookie: admin_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "currentPrice": 19.99}' \
  https://your-domain.com/api/admin/external-products/PRODUCT_ID
```

**Expected Response:**
```json
{
  "id": "string",
  "name": "New Name",
  "currentPrice": 19.99,
  "isEdited": true,
  "editedFields": ["name", "currentPrice"],
  ...
}
```

**Pass/Fail:** ___

---

## Test Suite 8: Browser Compatibility

### Test 8.1: Chrome/Edge
- [ ] Dark/light mode toggle works
- [ ] External products render correctly
- [ ] Edit modal opens/closes smoothly
- [ ] Images load
- [ ] Purchase flow completes

### Test 8.2: Firefox
- [ ] Same tests as Chrome
- [ ] CSS gradients render correctly

### Test 8.3: Safari
- [ ] Same tests as Chrome
- [ ] localStorage works for theme preference

### Test 8.4: Mobile (iOS Safari, Chrome Mobile)
- [ ] Layout responsive on small screens
- [ ] Touch interactions work
- [ ] Modal scales properly
- [ ] Dark mode toggle accessible
- [ ] Product cards stack correctly

---

## Test Results Summary

| Test Suite | Tests | Passed | Failed | Notes |
|-----------|-------|--------|--------|-------|
| 1. Syncing | 2 | _ | _ | |
| 2. Editing | 2 | _ | _ | |
| 3. Main Page | 2 | _ | _ | |
| 4. Escrow | 2 | _ | _ | |
| 5. Existing Features | 3 | _ | _ | |
| 6. Performance | 3 | _ | _ | |
| 7. API Contracts | 3 | _ | _ | |
| 8. Browser Compat | 4 | _ | _ | |
| **TOTAL** | **22** | **_** | **_** | |

---

## Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables configured on Vercel
- [ ] Database migrations applied to production
- [ ] Admin credentials updated in production
- [ ] Wallet addresses configured in production
- [ ] Domain SSL certificate valid
- [ ] Error logs reviewed
- [ ] Performance metrics acceptable (< 3s page load)
- [ ] Monitoring/alerts configured
- [ ] Backup strategy verified

---

## Known Issues & Workarounds

### Issue: Images not loading from external source
**Workaround:** Configure CORS headers or proxy images through your server

### Issue: Sync takes too long
**Workaround:** Implement pagination in scraper or offload to background job

### Issue: Price not converting correctly
**Workaround:** Verify crypto exchange rate API is responding

---

## Rollback Plan

If critical issues discovered:
1. Set external products feature flag to false in admin
2. Remove 🔗 External Products tab from navigation
3. Disable sync endpoint: return 503 Service Unavailable
4. Migrate users to internal products only
5. Investigate and fix issues
6. Re-enable with phased rollout to 10% of users first

---

## Additional Notes

- Keep this guide updated as new features are added
- Document any production incidents and resolutions
- Regular performance profiling (monthly)
- Security audit of admin endpoints (quarterly)


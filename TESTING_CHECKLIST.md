# Complete Testing Checklist - Invoice Generator SaaS

**Test EVERYTHING before accepting real payments!**

---

## Pre-Deployment Testing (Local Development)

### 1. Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Add Stripe TEST keys (sk_test_...)
- [ ] Run `npm install` successfully
- [ ] Run `npm run dev`
- [ ] App starts on http://localhost:3000

### 2. Database Initialization
- [ ] Check `./db` folder created
- [ ] Files created: `users.db`, `invoices.db`, `clients.db`, `subscriptions.db`

### 3. Authentication Flow
- [ ] Homepage loads correctly
- [ ] Click "Sign In" - redirects to auth page
- [ ] Sign up with email works
- [ ] Email verification (if enabled)
- [ ] Login with credentials works
- [ ] Logout works
- [ ] Password reset (if configured)

### 4. Free Plan (Default)
- [ ] New user has "Free" plan
- [ ] Dashboard shows "3 invoices remaining"
- [ ] Can create invoice #1 ✓
- [ ] Can create invoice #2 ✓
- [ ] Can create invoice #3 ✓
- [ ] CANNOT create invoice #4 (limit reached error)
- [ ] Error message: "Upgrade your plan to create more invoices"

### 5. Invoice Creation
- [ ] "Create Invoice" page loads
- [ ] Client name field works
- [ ] Client email field works
- [ ] Client address field works
- [ ] Date picker works
- [ ] Due date picker works
- [ ] Add line item works
- [ ] Remove line item works
- [ ] Multiple line items work
- [ ] Quantity calculation correct
- [ ] Rate calculation correct
- [ ] Subtotal calculates correctly
- [ ] Total calculates correctly
- [ ] Notes field works
- [ ] Submit creates invoice
- [ ] Invoice appears on dashboard
- [ ] Invoice number auto-increments (INV-001, INV-002, etc.)

### 6. Invoice Management
- [ ] Dashboard lists all invoices
- [ ] Invoice status shows correctly (Paid/Unpaid)
- [ ] Edit invoice works
- [ ] Delete invoice works
- [ ] Invoice count updates after delete
- [ ] Stats update correctly (total, paid, unpaid)

### 7. Pricing Page
- [ ] Pricing page loads
- [ ] Shows 4 plans: Free, Starter, Pro, Business
- [ ] Prices correct: $0, $10, $20, $30
- [ ] Features listed correctly
- [ ] "Get Started" buttons work
- [ ] Free plan shows "Current Plan" if logged in on free
- [ ] Clicking "Get Started" redirects to Stripe Checkout

### 8. Stripe Checkout Integration
- [ ] Clicking plan opens Stripe Checkout in new page
- [ ] Checkout shows correct price
- [ ] Checkout shows correct plan name
- [ ] Test card works: 4242 4242 4242 4242
- [ ] Success: Redirects to /dashboard?upgraded=true
- [ ] Cancel: Redirects to /pricing
- [ ] Declined card shows error: 4000 0000 0000 0002

### 9. Subscription Upgrade Flow
- [ ] After successful payment, redirects to dashboard
- [ ] Dashboard shows new plan (Starter/Pro/Business)
- [ ] Invoice limit updates correctly:
  - Starter: 25/month
  - Pro: Unlimited
  - Business: Unlimited
- [ ] Can create more invoices after upgrade
- [ ] Stripe Dashboard shows subscription created

### 10. Webhook Testing (Local)
```bash
# Install Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/webhook/stripe

# In another terminal, trigger test events
stripe trigger checkout.session.completed
```

- [ ] Webhook receives event
- [ ] Subscription updates in database
- [ ] Console shows: "Webhook received: checkout.session.completed"
- [ ] No errors in webhook handler

---

## Post-Deployment Testing (Production)

### 1. Deployment Verification
- [ ] App deployed successfully
- [ ] No build errors
- [ ] Logs show "Ready on http://localhost:3000 [production]"
- [ ] Visit app URL - homepage loads
- [ ] HTTPS works (lock icon in browser)
- [ ] No console errors in browser devtools

### 2. Environment Variables Check
- [ ] All env vars set in platform (Railway/Heroku/Render)
- [ ] STRIPE_SECRET_KEY present
- [ ] STRIPE_WEBHOOK_SECRET present
- [ ] SERVER_URL correct
- [ ] App restarts after adding variables

### 3. Repeat All Core Tests (Production)
- [ ] Sign up works
- [ ] Login works
- [ ] Create invoice works
- [ ] Dashboard loads
- [ ] Pricing page loads
- [ ] Stripe checkout works

### 4. Webhook Testing (Production)
- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] URL correct: https://yourapp.com/api/webhook/stripe
- [ ] 3 events selected:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
- [ ] Send test event from Stripe Dashboard
- [ ] Check webhook logs in Stripe: Should see 200 response
- [ ] Check app logs: Should see webhook event processed

### 5. End-to-End Payment Test
**IMPORTANT: Use Stripe TEST mode for this**

- [ ] Create new account
- [ ] See "Free" plan (3 invoices)
- [ ] Create 3 test invoices
- [ ] Try to create 4th - blocked ✓
- [ ] Go to Pricing
- [ ] Click "Get Started" on Starter plan
- [ ] Enter test card: 4242 4242 4242 4242
- [ ] Complete checkout
- [ ] Redirect to dashboard
- [ ] Plan shows "Starter"
- [ ] Limit shows "25/month" or "22 remaining"
- [ ] Create 4th invoice - now works! ✓
- [ ] Check Stripe Dashboard:
  - Payment received
  - Subscription active
  - Customer created

### 6. Mobile Testing
- [ ] Open app on mobile device
- [ ] Homepage responsive
- [ ] Dashboard responsive
- [ ] Create invoice form usable on mobile
- [ ] Buttons are tappable
- [ ] Text is readable
- [ ] No horizontal scrolling

### 7. Browser Testing
Test on 3+ browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile Safari (iPhone)
- [ ] Mobile Chrome (Android)

### 8. Performance Testing
- [ ] PageSpeed Insights: https://pagespeed.web.dev
- [ ] Score > 70 (good enough for launch)
- [ ] Pages load in < 3 seconds
- [ ] No slow database queries
- [ ] Images optimized

### 9. Error Handling
- [ ] Visit non-existent page: Shows 404
- [ ] Submit empty invoice form: Shows validation errors
- [ ] Use expired Stripe checkout: Shows expired message
- [ ] Disconnect internet and try action: Shows error
- [ ] Try to access /dashboard without login: Redirects to login

### 10. Security Testing
- [ ] HTTPS enabled (lock icon)
- [ ] Can't access other users' invoices
- [ ] Can't create invoice for another user
- [ ] API requires authentication
- [ ] Stripe keys not visible in frontend code
- [ ] No sensitive data in console logs
- [ ] Session expires after logout

---

## Stress Testing (Optional but Recommended)

### 1. Create Many Invoices
- [ ] Create 50+ invoices rapidly
- [ ] App remains responsive
- [ ] Database handles load
- [ ] No memory leaks

### 2. Test Limits
- [ ] Free user can't exceed 3 invoices
- [ ] Starter user can't exceed 25 invoices
- [ ] Pro user truly unlimited (create 100+)
- [ ] Limit resets correctly each month

### 3. Edge Cases
- [ ] Invoice with 20+ line items
- [ ] Very long client name (500 characters)
- [ ] Very large invoice amount ($999,999.99)
- [ ] Special characters in notes field
- [ ] Empty line items (should show validation error)
- [ ] Negative quantities (should prevent or handle)
- [ ] Zero-dollar invoice

---

## Before Switching to Stripe LIVE Mode

### Final Checklist:
- [ ] All tests above passed in TEST mode
- [ ] Webhook working in production
- [ ] At least 3 successful test payments completed
- [ ] No errors in production logs (past 24 hours)
- [ ] Database persisting data correctly
- [ ] Backups configured (if available on platform)
- [ ] Terms of Service page created (recommended)
- [ ] Privacy Policy page created (recommended)
- [ ] Contact/Support email set up

### Stripe Account Ready:
- [ ] Stripe account fully verified
- [ ] Business details submitted
- [ ] Bank account connected
- [ ] Tax information provided
- [ ] Identity verification complete (if required)
- [ ] Account approved (check Stripe Dashboard)

### Legal Requirements:
- [ ] Business registered (sole proprietor OK for starting)
- [ ] Tax ID / EIN obtained (if in US)
- [ ] Understand your tax obligations
- [ ] Have accounting system for tracking revenue

---

## Going LIVE - Final Test

### 1. Switch to Live Keys
```bash
# Update environment variables
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

### 2. Create New Webhook (LIVE Mode)
- [ ] Stripe Dashboard > Switch to LIVE mode
- [ ] Create new webhook endpoint
- [ ] Same URL: https://yourapp.com/api/webhook/stripe
- [ ] Same 3 events
- [ ] Copy new webhook secret
- [ ] Update STRIPE_WEBHOOK_SECRET in app

### 3. Test with REAL Money
- [ ] Create account with YOUR email
- [ ] Subscribe to Starter plan ($10)
- [ ] Use YOUR REAL credit card
- [ ] Complete payment
- [ ] Verify charge appears in your bank
- [ ] Check Stripe Dashboard - payment shows
- [ ] App updates plan correctly
- [ ] Create invoice - works!
- [ ] REFUND yourself in Stripe Dashboard

### 4. Monitor First 24 Hours
- [ ] Check logs every few hours
- [ ] Monitor Stripe Dashboard
- [ ] Watch for errors
- [ ] Test on different devices
- [ ] Have friends test it

---

## Ongoing Monitoring

### Daily (First Week):
- [ ] Check error logs
- [ ] Monitor Stripe Dashboard
- [ ] Check new signups
- [ ] Respond to support emails
- [ ] Test critical flows still work

### Weekly:
- [ ] Review revenue
- [ ] Check webhook delivery success rate
- [ ] Monitor app performance
- [ ] Check for security updates
- [ ] Back up database (if not automatic)

### Monthly:
- [ ] Review all subscriptions
- [ ] Check for failed payments
- [ ] Update dependencies (npm update)
- [ ] Review and improve app

---

## Troubleshooting Test Failures

### "Cannot create invoice" after upgrade
**Cause:** Webhook didn't fire or failed

**Fix:**
1. Check Stripe Dashboard > Webhooks > Event logs
2. Look for 200 response (success) or error
3. If error, check webhook secret is correct
4. Resend test event from Stripe Dashboard

### "Stripe checkout not opening"
**Cause:** Invalid Stripe key or missing key

**Fix:**
1. Check browser console for errors
2. Verify STRIPE_SECRET_KEY is set
3. Make sure key starts with sk_test_ (or sk_live_)
4. No extra spaces in key

### "Webhook signature verification failed"
**Cause:** Wrong webhook secret

**Fix:**
1. Get correct secret from Stripe Dashboard
2. Update STRIPE_WEBHOOK_SECRET
3. Restart app
4. Send test event

### "Database not persisting"
**Cause:** NEDB_PATH not set or not writable

**Fix:**
1. Set NEDB_PATH=./db
2. Check file system permissions
3. Check logs for write errors

---

## Testing Checklist Summary

**Total Tests: ~120+**

**MUST PASS before going live:**
- ✅ All authentication tests
- ✅ All invoice CRUD tests
- ✅ All subscription upgrade tests
- ✅ All Stripe checkout tests
- ✅ Webhook tests (both test and production)
- ✅ End-to-end payment test with REAL card

**Nice to have:**
- Browser compatibility
- Mobile responsive
- Performance optimization
- Stress testing

---

## Quick Test Commands

```bash
# Local development
npm run dev

# Test build
npm run build
npm start

# Check for errors
tail -f logs/error.log

# Test webhook (Stripe CLI required)
stripe listen --forward-to localhost:3000/api/webhook/stripe
stripe trigger checkout.session.completed
```

---

**Remember: It's better to spend 2 hours testing than to lose customers to bugs!**

# Complete Stripe Setup Guide - Invoice Generator SaaS

**Time Required: 15 minutes**
**Cost: $0 (Stripe is free to set up)**

---

## Step 1: Create Stripe Account (2 minutes)

1. Go to https://stripe.com
2. Click **"Start now"** or **"Sign up"**
3. Fill in:
   - Email address
   - Full name
   - Country (important for payments)
   - Password
4. Click **"Create account"**
5. Verify your email (check inbox)

---

## Step 2: Get Your API Keys (1 minute)

1. Log into Stripe Dashboard: https://dashboard.stripe.com
2. Click **"Developers"** in the top right
3. Click **"API keys"** in the left sidebar
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`, click "Reveal test key")

**COPY THESE NOW - You'll need them in Step 6**

---

## Step 3: Enable Stripe Checkout (Already Enabled)

Good news! Stripe Checkout is enabled by default. Nothing to do here.

---

## Step 4: Set Up Webhook Endpoint (5 minutes)

**IMPORTANT: Do this AFTER you deploy your app (Step 5)**

### Why Webhooks?
When customers subscribe/cancel, Stripe needs to tell your app. Webhooks do this automatically.

### Once Your App is Deployed:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter your endpoint URL:
   ```
   https://YOUR-APP-URL.com/api/webhook/stripe
   ```
   Example: `https://invoiceflow.herokuapp.com/api/webhook/stripe`

4. Click **"Select events"**
5. Search and select these 3 events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

6. Click **"Add events"**
7. Click **"Add endpoint"**

8. **COPY YOUR WEBHOOK SECRET**:
   - After creating, click on the endpoint
   - Click **"Reveal"** under "Signing secret"
   - Copy the value (starts with `whsec_`)
   - You'll need this in Step 6

---

## Step 5: Deploy Your App

Choose ONE deployment method:

### Option A: Railway (RECOMMENDED - Easiest)

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Connect your GitHub account
5. Select your repository: `emmron/nextjswew`
6. Select branch: `claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP`
7. Railway will auto-detect Next.js
8. Click **"Deploy Now"**
9. Wait 3-5 minutes for build
10. Railway will give you a URL like: `https://yourapp.up.railway.app`

**That's it! Railway handles everything automatically.**

### Option B: Heroku (More Complex)

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Deploy: `git push heroku claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP:main`
5. Open app: `heroku open`

### Option C: Render (Good Alternative)

1. Go to https://render.com
2. Click **"New +"** > **"Web Service"**
3. Connect GitHub repo
4. Select branch: `claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP`
5. Settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. Click **"Create Web Service"**

---

## Step 6: Add Environment Variables to Your Deployed App

### On Railway:

1. Go to your project dashboard
2. Click **"Variables"** tab
3. Add these variables:

```
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
SERVER_URL=https://yourapp.up.railway.app
PORT=3000
NEDB_PATH=./db
EMAIL_FROM=noreply@yourdomain.com
```

4. Click **"Deploy"** to restart with new variables

### On Heroku:

```bash
heroku config:set STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
heroku config:set SERVER_URL=https://yourapp.herokuapp.com
```

### On Render:

1. Go to your web service
2. Click **"Environment"**
3. Add each variable manually
4. Click **"Save Changes"**

---

## Step 7: Test Stripe Integration (5 minutes)

### Test Checkout Flow:

1. Visit your deployed app
2. Sign up for an account
3. Go to **"Pricing"** page
4. Click **"Get Started"** on Starter plan
5. You should be redirected to Stripe Checkout

### Use Stripe Test Cards:

**Success Card**:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

**Declined Card** (to test errors):
- Card: `4000 0000 0000 0002`

### Verify Subscription Created:

1. Complete test checkout with 4242 card
2. Check Stripe Dashboard > **"Payments"**
   - You should see a successful payment
3. Check Stripe Dashboard > **"Subscriptions"**
   - You should see an active subscription
4. Go back to your app's Dashboard
   - Your plan should show "Starter" (or whichever you chose)
   - Invoice limit should update

---

## Step 8: Switch to Live Mode (When Ready to Accept Real Payments)

### ONLY DO THIS WHEN YOU'RE READY TO LAUNCH FOR REAL

1. Complete Stripe account verification:
   - Go to https://dashboard.stripe.com
   - Click banner **"Activate your account"**
   - Provide:
     - Business details
     - Bank account (for payouts)
     - Tax information
   - This takes 1-2 business days for approval

2. Get LIVE API keys:
   - Go to https://dashboard.stripe.com/apikeys
   - Toggle **"View test data"** to OFF (top right)
   - Copy your LIVE keys (start with `pk_live_` and `sk_live_`)

3. Update environment variables:
   - Replace `STRIPE_SECRET_KEY` with `sk_live_...`
   - Create NEW webhook for live mode
   - Replace `STRIPE_WEBHOOK_SECRET` with new webhook secret

4. Test with REAL card (start with small amount)

---

## Troubleshooting

### "Invalid API key provided"
- Check that you copied the FULL key (no spaces)
- Make sure you're using the SECRET key (sk_test_...), not publishable key
- Restart your app after adding environment variables

### "No such webhook endpoint"
- Make sure your app is deployed and accessible
- Check webhook URL matches exactly: `https://yourapp.com/api/webhook/stripe`
- Verify you selected the 3 events listed in Step 4

### "Subscription not updating in app"
- Check webhook is configured correctly
- Look at Stripe Dashboard > Webhooks > Your endpoint > **"Events"**
- Click on an event to see the response
- If response is not 200, your webhook endpoint has an error

### "Checkout session expired"
- Checkout sessions expire after 24 hours
- Just create a new one by clicking "Get Started" again

---

## Security Checklist

✅ **NEVER commit API keys to Git**
✅ **Use environment variables only**
✅ **Use test keys for development** (`sk_test_...`)
✅ **Use live keys for production** (`sk_live_...`)
✅ **Keep webhook secret secure** (treat like password)
✅ **Enable Stripe Radar** (fraud detection - free on Stripe)

---

## Cost Breakdown

**Stripe Fees** (same for everyone):
- 2.9% + $0.30 per successful transaction

**Examples**:
- $10 Starter plan = You receive $9.41
- $20 Pro plan = You receive $19.12
- $30 Business plan = You receive $28.83

**No monthly fees from Stripe!**

---

## Next Steps After Stripe Setup

1. ✅ Stripe account created
2. ✅ API keys obtained
3. ✅ App deployed
4. ✅ Environment variables set
5. ✅ Webhook configured
6. ✅ Test payment successful
7. ⏳ **Create your first real invoice!**
8. ⏳ **Start marketing your app**
9. ⏳ **Get your first paying customer**

---

## Quick Reference - All URLs

- **Stripe Dashboard**: https://dashboard.stripe.com
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Payments**: https://dashboard.stripe.com/payments
- **Subscriptions**: https://dashboard.stripe.com/subscriptions
- **Test Cards**: https://stripe.com/docs/testing

---

**Questions or issues? Check Stripe docs: https://stripe.com/docs**

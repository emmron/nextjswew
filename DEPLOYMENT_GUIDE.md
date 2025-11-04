# Complete Deployment Guide - Invoice Generator SaaS

**Choose ONE deployment method below. Railway is EASIEST for beginners.**

---

## Method 1: Railway (RECOMMENDED) ⭐

**Why Railway?**
- ✅ Easiest to deploy (literally 3 clicks)
- ✅ Free $5/month credit (enough for small apps)
- ✅ Automatic HTTPS
- ✅ Automatic deployments from Git
- ✅ Built-in database support
- ✅ No credit card required to start

### Step-by-Step:

**1. Create Railway Account** (1 minute)
```
1. Go to: https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway
```

**2. Deploy from GitHub** (2 minutes)
```
1. Click "New Project"
2. Click "Deploy from GitHub repo"
3. Select repository: emmron/nextjswew
4. Select branch: claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP
5. Railway auto-detects Next.js and starts deploying
6. Wait 3-5 minutes for build to complete
```

**3. Add Environment Variables** (3 minutes)
```
1. Click on your deployed service
2. Go to "Variables" tab
3. Click "New Variable" and add each:

   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   SERVER_URL=https://YOUR-APP.up.railway.app
   PORT=3000
   NEDB_PATH=./db
   EMAIL_FROM=noreply@invoiceflow.com
   NODE_ENV=production

4. Click "Deploy" to restart with new variables
```

**4. Get Your App URL** (30 seconds)
```
1. Go to "Settings" tab
2. Scroll to "Networking"
3. Click "Generate Domain"
4. Your app is live at: https://YOUR-APP.up.railway.app
```

**5. Set Up Stripe Webhook** (2 minutes)
```
Follow STRIPE_SETUP_GUIDE.md Step 4
Use your Railway URL: https://YOUR-APP.up.railway.app/api/webhook/stripe
```

**Done! Your app is live and ready to accept payments.**

### Railway Tips:
- Free tier: $5/month credit = ~500 hours (plenty for starting)
- If you hit limits, upgrade to Hobby plan ($5/month)
- Logs: Click "Deployments" > "View Logs"
- Database: Railway can add PostgreSQL if you upgrade later

---

## Method 2: Heroku

**Why Heroku?**
- Well-known platform
- Good documentation
- Easy scaling

**Prerequisites:**
- Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli

### Step-by-Step:

**1. Login to Heroku**
```bash
heroku login
```

**2. Create Heroku App**
```bash
cd /home/user/nextjswew
heroku create your-app-name
# Example: heroku create invoiceflow-saas
```

**3. Set Environment Variables**
```bash
heroku config:set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
heroku config:set SERVER_URL=https://your-app-name.herokuapp.com
heroku config:set PORT=3000
heroku config:set NEDB_PATH=./db
heroku config:set EMAIL_FROM=noreply@invoiceflow.com
heroku config:set NODE_ENV=production
```

**4. Deploy**
```bash
git checkout claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP
git push heroku claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP:main
```

**5. Open Your App**
```bash
heroku open
```

**6. View Logs** (if something goes wrong)
```bash
heroku logs --tail
```

### Heroku Tips:
- Free tier: App sleeps after 30 min inactivity (first request is slow)
- Upgrade to Hobby ($7/month) for always-on
- Database: Add Heroku Postgres addon if needed

---

## Method 3: Render

**Why Render?**
- Free tier doesn't sleep (unlike Heroku)
- Modern platform
- Good performance

### Step-by-Step:

**1. Create Render Account**
```
Go to: https://render.com
Sign up with GitHub
```

**2. Create New Web Service**
```
1. Click "New +" > "Web Service"
2. Connect your GitHub repository
3. Select repository: emmron/nextjswew
4. Branch: claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP
```

**3. Configure Service**
```
Name: invoiceflow
Environment: Node
Region: Choose closest to you (e.g., Oregon USA)
Branch: claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP
Build Command: npm install && npm run build
Start Command: npm start
```

**4. Add Environment Variables**
```
Click "Advanced" > "Add Environment Variable"

Add each:
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
SERVER_URL=https://invoiceflow.onrender.com
PORT=3000
NEDB_PATH=./db
EMAIL_FROM=noreply@invoiceflow.com
NODE_ENV=production
```

**5. Deploy**
```
1. Click "Create Web Service"
2. Wait 5-10 minutes for build
3. Your app will be live at: https://YOUR-APP.onrender.com
```

### Render Tips:
- Free tier: Limited to 750 hours/month
- Apps on free tier spin down after inactivity (30s cold start)
- Upgrade to Starter ($7/month) for always-on

---

## Method 4: Vercel (Advanced)

**Note:** Vercel is optimized for static/serverless Next.js. Our app uses custom Express server, so Railway/Heroku are better options.

If you still want to try:

```bash
npm install -g vercel
vercel login
vercel --prod
```

You'll need to modify the app to use Next.js API routes instead of Express routes.

---

## Method 5: DigitalOcean App Platform

**1. Create DigitalOcean Account**
```
Go to: https://cloud.digitalocean.com
Sign up (new users get $200 credit for 60 days!)
```

**2. Create App**
```
1. Click "Create" > "Apps"
2. Connect GitHub
3. Select repository and branch
4. DigitalOcean auto-detects Next.js
```

**3. Configure**
```
Build Command: npm install && npm run build
Run Command: npm start
HTTP Port: 3000
```

**4. Add Environment Variables**
Same as other platforms above

**5. Launch**
App will be at: https://YOUR-APP.ondigitalocean.app

---

## Post-Deployment Checklist

After deploying to ANY platform:

### 1. Test Basic Functionality
- [ ] Visit your app URL - does homepage load?
- [ ] Sign up for an account - does it work?
- [ ] Login - does it work?
- [ ] Visit /dashboard - does it load?
- [ ] Visit /pricing - does it load?

### 2. Test Stripe Integration
- [ ] Click "Get Started" on a pricing plan
- [ ] Redirects to Stripe Checkout?
- [ ] Complete test payment (4242 4242 4242 4242)
- [ ] Redirected back to dashboard?
- [ ] Plan updated in your dashboard?

### 3. Test Invoice Creation
- [ ] Go to "Create Invoice"
- [ ] Fill out form
- [ ] Submit - does it save?
- [ ] View on dashboard - is it listed?

### 4. Set Up Monitoring
- [ ] Check deployment platform logs
- [ ] Set up error alerts (if available)
- [ ] Bookmark logs URL for quick access

### 5. Performance Check
- [ ] Test site speed: https://pagespeed.web.dev
- [ ] Should load in < 3 seconds
- [ ] If slow, check logs for errors

---

## Troubleshooting Common Issues

### "Application Error" / "Cannot GET /"

**Check logs first!**
```bash
# Railway
Click "Deployments" > "View Logs"

# Heroku
heroku logs --tail

# Render
Click service > "Logs" tab
```

**Common causes:**
1. Missing environment variables
   - Solution: Double-check all variables are set
2. Build failed
   - Solution: Check build logs, likely npm install issue
3. Port mismatch
   - Solution: Make sure PORT=3000 in environment variables

### "Error: Cannot find module 'stripe'"

**Cause:** Dependencies not installed

**Solution:**
```bash
# Make sure package.json has stripe
# Redeploy to trigger npm install
```

### Database/Invoice Errors

**Cause:** NEDB_PATH not set or not writable

**Solution:**
```bash
# Set NEDB_PATH=./db
# Make sure app has write permissions
```

### Webhook Not Receiving Events

**Cause:** Webhook URL incorrect or app not accessible

**Solution:**
1. Test your app URL in browser - does it load?
2. Check webhook URL in Stripe Dashboard
3. Should be: https://YOUR-DOMAIN.com/api/webhook/stripe
4. Test webhook: Stripe Dashboard > Webhooks > Send test event

---

## Scaling Your App

### When You Outgrow Free Tier:

**Signs you need to upgrade:**
- Getting 100+ users
- App feels slow
- Running out of free hours
- Need more database storage

**Recommended upgrades:**
1. **Railway Hobby**: $5/month - good for 500-1000 users
2. **Heroku Hobby**: $7/month - always-on, better performance
3. **Render Starter**: $7/month - good performance
4. **DigitalOcean Basic**: $5/month - best value for scaling

### When to Consider Dedicated Server:

- 5,000+ users
- $1,000+/month revenue
- Need better performance
- Options: AWS, Google Cloud, DigitalOcean Droplets

---

## Security Checklist

Before going live with REAL payments:

- [ ] All environment variables are set correctly
- [ ] Using HTTPS (automatic on all platforms above)
- [ ] Stripe webhook secret is set
- [ ] Using strong session secret
- [ ] Error messages don't expose sensitive info
- [ ] Test mode is disabled in Stripe (when ready for real $)

---

## Going Live - Final Steps

### 1. Switch to Stripe Live Mode

Follow STRIPE_SETUP_GUIDE.md "Step 8: Switch to Live Mode"

### 2. Update Environment Variables
```bash
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

### 3. Test One More Time
- Make a REAL payment (your own card)
- Start with smallest plan ($10)
- Verify everything works end-to-end
- Refund yourself in Stripe Dashboard

### 4. Launch! 🚀
- Announce on social media
- Post on Reddit (r/SideProject)
- Share with friends/family
- Start marketing!

---

## Quick Links

- **Railway**: https://railway.app
- **Heroku**: https://heroku.com
- **Render**: https://render.com
- **Vercel**: https://vercel.com
- **DigitalOcean**: https://digitalocean.com

---

**Need help? Check logs first, then Google the error message. Most issues are environment variable related.**

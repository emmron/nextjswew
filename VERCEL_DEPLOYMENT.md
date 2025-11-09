# 🚀 Vercel Deployment Guide - InvoiceFlow

**Deploy InvoiceFlow to Vercel in 15 minutes**

---

## ⚠️ Important: Database Consideration

Vercel uses **serverless functions**, which means:
- ✅ No custom Express server needed (we converted routes to Next.js API routes)
- ⚠️ **NeDB (file-based database) won't persist data** between deployments
- ✅ Solution: Use MongoDB Atlas (free tier) OR Vercel Postgres

**This guide covers both options.**

---

## 🎯 Quick Decision: Which Database?

### Option A: MongoDB Atlas (Recommended)
- ✅ Free tier (512MB storage)
- ✅ Easy setup (5 minutes)
- ✅ Persistent data
- ✅ Scalable
- ✅ Works with existing models (minimal code changes)

### Option B: Vercel Postgres
- ✅ Integrated with Vercel
- ✅ Free tier available
- ⚠️ Requires more code changes (SQL instead of NeDB)

### Option C: Keep NeDB (Development Only)
- ⚠️ Data lost on every deployment
- ✅ Good for testing Vercel deployment
- ❌ NOT for production

**For production, choose Option A (MongoDB Atlas) - it's easiest!**

---

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository (2 min)

All files are already created! You have:
- ✅ Next.js API routes (pages/api/*)
- ✅ vercel.json configuration
- ✅ All frontend pages

**Ensure all changes are committed:**
```bash
git add -A
git commit -m "Add Vercel support with Next.js API routes"
git push origin claude/invoice-saas-011CUg84cnJZLmNUSkBaVPvP
```

---

### Step 2: Set Up Database (5 min)

#### Option A: MongoDB Atlas (Recommended)

**1. Create MongoDB Atlas Account:**
```
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free account)
3. Create new cluster (M0 Free tier)
4. Choose cloud provider & region (closest to you)
5. Cluster name: "invoiceflow" (or anything)
6. Click "Create Cluster" (takes 3-5 minutes)
```

**2. Create Database User:**
```
1. Click "Database Access" (left sidebar)
2. Click "Add New Database User"
3. Username: invoiceflow
4. Password: (generate secure password, SAVE IT!)
5. Database User Privileges: "Read and write to any database"
6. Click "Add User"
```

**3. Whitelist IP Addresses:**
```
1. Click "Network Access" (left sidebar)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"
```

**4. Get Connection String:**
```
1. Click "Database" (left sidebar)
2. Click "Connect" on your cluster
3. Click "Connect your application"
4. Copy the connection string, looks like:
   mongodb+srv://invoiceflow:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

5. Replace <password> with your actual password
6. Save this - you'll need it for Vercel!
```

---

### Step 3: Deploy to Vercel (5 min)

**1. Create Vercel Account:**
```
1. Go to: https://vercel.com/signup
2. Sign up with GitHub
3. Authorize Vercel to access your repositories
```

**2. Import Project:**
```
1. Click "Add New..." → "Project"
2. Select your repository: emmron/nextjswew
3. Click "Import"
```

**3. Configure Project:**
```
Framework Preset: Next.js (auto-detected)
Root Directory: ./
Build Command: next build
Output Directory: .next
Install Command: npm install --legacy-peer-deps
```

**4. Add Environment Variables:**

Click "Environment Variables" and add these:

**Required for all options:**
```
STRIPE_SECRET_KEY = sk_test_your_stripe_key_here
STRIPE_WEBHOOK_SECRET = whsec_your_webhook_secret
SERVER_URL = https://your-project.vercel.app
EMAIL_FROM = noreply@invoiceflow.com
NODE_ENV = production
```

**For MongoDB Atlas (Option A):**
```
MONGODB_URI = mongodb+srv://invoiceflow:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/invoiceflow?retryWrites=true&w=majority
USE_MONGODB = true
```

**For NeDB (testing only):**
```
NEDB_PATH = /tmp/db
```

**5. Deploy:**
```
1. Click "Deploy"
2. Wait 2-3 minutes
3. Your app will be live at: https://your-project.vercel.app
```

---

### Step 4: Update Code for MongoDB (If Using Option A)

**If you're using MongoDB Atlas, you need to update the models.**

Create a new file `models/db.js`:

```javascript
// models/db.js - Database adapter for MongoDB/NeDB

let dbAdapter

if (process.env.USE_MONGODB === 'true' && process.env.MONGODB_URI) {
  // Use MongoDB for production
  const { MongoClient } = require('mongodb')

  let cachedClient = null
  let cachedDb = null

  async function connectToDatabase() {
    if (cachedDb) {
      return { client: cachedClient, db: cachedDb }
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    const db = client.db('invoiceflow')

    cachedClient = client
    cachedDb = db

    return { client, db }
  }

  dbAdapter = {
    async getCollection(name) {
      const { db } = await connectToDatabase()
      return db.collection(name)
    }
  }
} else {
  // Use NeDB for local development
  const Datastore = require('nedb')
  const path = require('path')

  const dbPath = process.env.NEDB_PATH || './db'

  const stores = {}

  dbAdapter = {
    async getCollection(name) {
      if (!stores[name]) {
        stores[name] = new Datastore({
          filename: path.join(dbPath, `${name}.db`),
          autoload: true
        })
      }
      return stores[name]
    }
  }
}

module.exports = dbAdapter
```

**Then update each model to use this adapter.** Example for `models/invoice.js`:

```javascript
const dbAdapter = require('./db')

class Invoice {
  static async create(invoice) {
    const collection = await dbAdapter.getCollection('invoices')

    if (process.env.USE_MONGODB === 'true') {
      // MongoDB
      const result = await collection.insertOne({
        ...invoice,
        createdAt: new Date()
      })
      return { ...invoice, _id: result.insertedId }
    } else {
      // NeDB
      return new Promise((resolve, reject) => {
        collection.insert({ ...invoice, createdAt: new Date() }, (err, doc) => {
          if (err) reject(err)
          else resolve(doc)
        })
      })
    }
  }

  // ... other methods similar pattern
}

module.exports = Invoice
```

**Full MongoDB model conversions are available in the repository under `models-mongodb/` folder.**

---

### Step 5: Configure Stripe Webhook (3 min)

**After deployment, set up the webhook:**

```
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: https://your-project.vercel.app/api/webhook/stripe
4. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
5. Click "Add endpoint"
6. Copy the webhook secret (whsec_...)
7. Update in Vercel:
   - Go to your project → Settings → Environment Variables
   - Update STRIPE_WEBHOOK_SECRET
   - Redeploy
```

---

## 🧪 Testing Your Vercel Deployment

### 1. Test Basic Access:
- Visit: https://your-project.vercel.app
- Homepage should load ✓

### 2. Test Authentication:
- Click "Sign In"
- Create account ✓
- Login ✓

### 3. Test Invoice Creation:
- Go to "Create Invoice"
- Fill in form
- Submit ✓
- Should appear on dashboard ✓

### 4. Test Subscription:
- Go to "Pricing"
- Click "Get Started" on Starter
- Enter test card: 4242 4242 4242 4242
- Complete checkout ✓
- Check subscription updated ✓

### 5. Test Webhook:
- Go to Stripe Dashboard → Webhooks
- Click your webhook endpoint
- Send test event: checkout.session.completed
- Should see 200 response ✓

---

## ⚙️ Vercel-Specific Configuration

### Environment Variables

**Required:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `SERVER_URL` - Your Vercel URL (https://your-project.vercel.app)

**Database (choose one):**
- `MONGODB_URI` - MongoDB connection string (if using MongoDB)
- `USE_MONGODB=true` - Enable MongoDB mode
- `NEDB_PATH=/tmp/db` - NeDB path (testing only)

**Optional:**
- `EMAIL_FROM` - Email for authentication
- `GOOGLE_ID` / `GOOGLE_SECRET` - OAuth providers
- `FACEBOOK_ID` / `FACEBOOK_SECRET` - OAuth providers

### Custom Domain (Optional)

**Add your own domain:**
```
1. Go to project → Settings → Domains
2. Add domain: invoiceflow.com
3. Update DNS records as shown
4. Update SERVER_URL to https://invoiceflow.com
```

---

## 🔧 Troubleshooting

### "Database not persisting data"
- ✓ Solution: Switch to MongoDB Atlas (Option A above)
- NeDB doesn't work on Vercel for production

### "API routes return 404"
- Check file paths: `pages/api/invoices/index.js` (not `invoice.js`)
- Ensure deployment completed successfully
- Check Vercel logs for errors

### "Webhook not receiving events"
- Verify webhook URL: https://your-project.vercel.app/api/webhook/stripe
- Check webhook secret is correct
- Test webhook in Stripe Dashboard
- Check Vercel function logs

### "Function timeout"
- MongoDB queries taking too long
- Check MongoDB Atlas is in same region as Vercel
- Optimize database indexes

### "Module not found" errors
- Run: `npm install --legacy-peer-deps`
- Commit package-lock.json
- Redeploy

---

## 📊 Vercel vs Other Platforms

| Feature | Vercel | Railway | Heroku |
|---------|--------|---------|--------|
| Setup time | 5 min | 10 min | 15 min |
| Custom domain | ✅ Free | ✅ Free | 💰 Paid |
| HTTPS | ✅ Auto | ✅ Auto | ✅ Auto |
| Database | Need external | ✅ Built-in | ✅ Add-ons |
| Free tier | ✅ Generous | ✅ Good | ⚠️ Limited |
| Serverless | ✅ Yes | ❌ No | ❌ No |
| Cold starts | ⚠️ Possible | ✅ None | ⚠️ Possible |

**Best for:**
- Vercel: Fastest deployment, best Next.js integration
- Railway: Easiest full-stack (no database setup)
- Heroku: Traditional apps, addons ecosystem

---

## 💡 Pro Tips

### 1. Use MongoDB Atlas Free Tier
- Free forever
- 512MB storage (enough for 10,000+ invoices)
- Automatic backups

### 2. Enable Analytics
```
1. Vercel project → Analytics
2. Enable Vercel Analytics
3. Track page views, performance
```

### 3. Set Up Preview Deployments
```
- Every git push = automatic preview deployment
- Test before merging to main
- Share preview URLs with team
```

### 4. Monitor Function Logs
```
1. Project → Deployments
2. Click deployment
3. Click "Functions" tab
4. See real-time logs
```

### 5. Optimize Performance
```javascript
// In next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
}
```

---

## 🚀 Quick Launch Checklist

- [ ] Repository pushed to GitHub
- [ ] MongoDB Atlas cluster created (Option A)
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Environment variables set
- [ ] First deployment successful
- [ ] Stripe webhook configured
- [ ] Test invoice creation works
- [ ] Test subscription upgrade works
- [ ] Custom domain added (optional)
- [ ] Launch! 🎉

---

## 📈 Scaling on Vercel

**Free Tier Limits:**
- 100GB bandwidth/month
- 100 serverless function executions/day
- Unlimited deployments

**When you outgrow free tier:**
- Pro plan: $20/month
- Unlimited bandwidth
- Advanced analytics
- Team collaboration

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Vercel Docs:** https://vercel.com/docs
- **Next.js API Routes:** https://nextjs.org/docs/api-routes/introduction
- **Stripe Webhooks:** https://dashboard.stripe.com/webhooks

---

## 🎉 You're Live on Vercel!

**Your InvoiceFlow SaaS is now:**
- ✅ Deployed globally via Vercel CDN
- ✅ Auto-scaling serverless functions
- ✅ HTTPS enabled automatically
- ✅ Git-based deployments
- ✅ Ready to make money! 💰

**Next steps:**
1. Test thoroughly (TESTING_CHECKLIST.md)
2. Switch Stripe to live mode
3. Launch on Product Hunt (LAUNCH_PLAN.md)
4. Get first customer! 🚀

**Vercel URL:** https://your-project.vercel.app

---

**Questions? Check Vercel docs or ask in their Discord: https://vercel.com/discord**

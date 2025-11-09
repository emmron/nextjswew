# SportsBet - Sports Betting Platform with Stripe Integration

A fully functional sports betting platform built with Next.js and Stripe payments.

## 🚀 Features

### User Features
- **User Authentication** - Email and OAuth sign-in
- **Membership System** - One-time signup fee ($10 default)
- **Wallet Management** - Secure deposits via Stripe
- **Live Betting** - Real-time odds on sports events
- **Bet History** - Track all your bets and winnings
- **Instant Payouts** - Winners get paid automatically

### Admin Features
- **Event Management** - Create and manage sports events
- **Set Odds** - Configure betting odds for each team
- **Settle Bets** - Mark winners and trigger automatic payouts
- **User Management** - Admin dashboard for oversight

## 💰 Revenue Model

1. **Membership Fee**: $10 one-time signup fee (100% profit)
2. **House Edge**: Set odds to ensure profit margin
   - Example: True odds 2.0, offer 1.95 (2.5% edge)
3. **Volume**: All losing bets go to the house

## 📋 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Stripe
1. Create account at https://dashboard.stripe.com/register
2. Get API keys from https://dashboard.stripe.com/test/apikeys
3. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
4. Add your Stripe keys to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
MEMBERSHIP_FEE=10
```

### 3. Set Up Stripe Webhooks

**For Development:**
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Copy the webhook signing secret to .env
```

**For Production:**
1. Deploy your app
2. Go to https://dashboard.stripe.com/webhooks
3. Add endpoint: `https://yourdomain.com/api/webhook/stripe`
4. Select event: `checkout.session.completed`
5. Copy signing secret to `.env`

### 4. Run the Application
```bash
npm run dev
```

Visit http://localhost:3000

## 🎯 How to Use

### For Users:
1. **Sign Up** - Create account via email or OAuth
2. **Pay Membership** - $10 one-time fee to activate betting
3. **Add Funds** - Deposit money via Stripe (minimum $5)
4. **Place Bets** - Browse events and place your bets
5. **Win Money** - Winnings automatically added to wallet

### For Admins:
1. **Make yourself admin** (see below)
2. **Create Events** - Go to Admin Events page
3. **Set Odds** - Configure betting odds
4. **Settle Bets** - After event ends, select winner
5. **Payouts** - Winners get paid automatically

## 👑 Making Yourself Admin

### Option 1: Edit Database Directly
1. Sign up normally first
2. Open `./db/users.db`
3. Find your user record
4. Add `"admin": true` to your record

### Option 2: Create a Script
Create `setup-admin.js`:
```javascript
const User = require('./models/user')

async function makeAdmin(email) {
  const user = await User.findOne({ email })
  if (user) {
    user.admin = true
    await User.update({ _id: user._id }, user)
    console.log('Admin access granted!')
  }
}

makeAdmin('your@email.com')
```

## 📱 Pages

- **/** - Homepage with featured events
- **/sports** - Browse all available events
- **/wallet** - Manage balance, pay membership, deposit
- **/my-bets** - View bet history and statistics
- **/admin-events** - Admin: Create and manage events
- **/account** - User account settings

## 💳 Testing Stripe Payments

Use these test cards in Stripe test mode:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- Any future expiry date
- Any 3-digit CVC

## 📊 Database Schema

### Events
```javascript
{
  name: "Lakers vs Warriors",
  sport: "Basketball",
  team1: "Lakers",
  team2: "Warriors",
  odds1: 1.85,
  odds2: 2.10,
  drawOdds: 3.50, // optional
  startTime: Date,
  status: "upcoming", // upcoming, live, finished
  winner: "Lakers" // set when settled
}
```

### Bets
```javascript
{
  userId: "user123",
  eventId: "event456",
  selection: "Lakers",
  amount: 100,
  odds: 1.85,
  potentialWin: 185,
  status: "active", // active, won, lost
  createdAt: Date
}
```

### Wallets
```javascript
{
  userId: "user123",
  balance: 500,
  membershipPaid: true,
  membershipPaidAt: Date
}
```

## 🎲 Setting Profitable Odds

To ensure profitability, set odds lower than true odds:

**Example: 50/50 Game**
- True odds: 2.00 for each team
- Your odds: 1.95 for each team
- House edge: 2.5%

**Example: Favorite vs Underdog**
- True odds: 1.50 (Favorite) / 2.67 (Underdog)
- Your odds: 1.45 (Favorite) / 2.50 (Underdog)
- House edge: ~3%

**Calculator:**
```
House Edge = (1 / odds1) + (1 / odds2) - 1
For profit: Keep this number > 0
```

## 🔒 Security Features

- ✅ Stripe secure payment processing
- ✅ HTTPS encryption (in production)
- ✅ CSRF token protection
- ✅ HTTP-only cookies
- ✅ Session management
- ✅ Input validation
- ✅ Membership verification

## 📈 Scaling Tips

1. **Use MongoDB** - Switch from NeDB to MongoDB for production
2. **Add Redis** - Cache frequently accessed data
3. **CDN** - Use CDN for static assets
4. **Rate Limiting** - Prevent abuse
5. **Monitoring** - Set up logging and alerts
6. **Backup** - Regular database backups

## ⚠️ Legal Disclaimer

**IMPORTANT: Online gambling is heavily regulated**

Before launching publicly:
- ✅ Check gambling laws in your jurisdiction
- ✅ Obtain required licenses and permits
- ✅ Implement age verification (18+/21+)
- ✅ Add responsible gambling features
- ✅ Display T&C and privacy policy
- ✅ Consult with a gambling lawyer
- ✅ Comply with payment processor terms

**This is a demo application for educational purposes.**

## 🐛 Troubleshooting

### Payments Not Working
- Check Stripe keys in `.env`
- Verify webhook is configured
- Check Stripe dashboard for errors
- Test with test cards first

### Bets Not Settling
- Ensure you're logged in as admin
- Check event status is 'upcoming'
- Verify winner selection
- Check console for errors

### Database Errors
- Create `./db` directory
- Check file permissions
- Verify NeDB is installed

## 📞 Support

Issues? Check:
- Browser console for errors
- Server logs: `npm run dev`
- Stripe dashboard logs
- Database files in `./db/`

## 🎉 Start Making Money Today!

1. Set up Stripe account (takes 5 minutes)
2. Configure the app (another 5 minutes)
3. Create some events
4. Start accepting bets!

Remember: House always wins with proper odds management! 💪

---

**Built with:**
- Next.js - React framework
- Stripe - Payment processing
- NeDB - Embedded database
- Bootstrap - UI components
- NextAuth - Authentication

**License:** MIT (but check gambling laws before using commercially)

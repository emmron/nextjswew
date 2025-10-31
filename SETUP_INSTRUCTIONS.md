# SportsBet Setup Instructions

## Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Set up Stripe**
   - Go to https://dashboard.stripe.com/register
   - Create a free account
   - Get your API keys from https://dashboard.stripe.com/test/apikeys
   - Copy `.env.example` to `.env` and add your keys:
   ```bash
   cp .env.example .env
   ```
   - Edit `.env` and add your Stripe keys

3. **Configure Stripe Webhook** (for production)
   - Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
   - Copy the webhook secret to `.env`

   For testing without webhook:
   - You can manually test by checking the database after payment

4. **Run the Application**
```bash
npm run dev
```

5. **Access the Site**
   - Open http://localhost:3000
   - Sign up with email authentication
   - Pay the membership fee ($10 default)
   - Add funds to your wallet
   - Start betting!

## Admin Access

To make a user an admin:
1. Sign up normally
2. Find your user in `./db/users.db`
3. Add `"admin": true` to your user record

Or use this route in your code to make the first user admin:
```javascript
// In routes/account.js or create a setup script
await User.update({email: 'your@email.com'}, {admin: true})
```

## Features

### User Features
- **Homepage** (`/`) - View featured sports events
- **Sports** (`/sports`) - Browse all available events and place bets
- **Wallet** (`/wallet`) - Manage your balance, pay membership, deposit funds
- **My Bets** (`/my-bets`) - View bet history and active bets
- **Account** (`/account`) - Manage your account settings

### Admin Features
- **Admin Events** (`/admin-events`) - Create, manage, and settle sports events

## How It Works

1. **User Registration**: Users sign up via email or OAuth
2. **Membership Fee**: One-time $10 fee (configurable via MEMBERSHIP_FEE env var)
3. **Deposits**: Users add funds via Stripe (minimum $5)
4. **Betting**: Users place bets on upcoming events
5. **Settlement**: Admins settle events and winners get paid automatically
6. **Payouts**: Winnings are added to user's wallet balance

## Revenue Model

- **Membership Fee**: $10 per user signup (100% revenue)
- **House Edge**: Set odds to ensure profit margin (e.g., true odds 2.0, offer 1.95)
- **Volume**: Collect fees on all losing bets

## Database

Uses NeDB (file-based database) with these collections:
- `users.db` - User accounts
- `wallets.db` - User balances
- `events.db` - Sports events
- `bets.db` - User bets

## Stripe Test Cards

Use these test cards in Stripe test mode:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date and any CVC

## Production Deployment

1. Set up MongoDB or keep using NeDB
2. Configure Stripe webhook endpoint
3. Set `SERVER_URL` in `.env`
4. Deploy to your hosting platform
5. Update Stripe webhook URL in dashboard

## Support

For issues, check:
- Stripe Dashboard for payment logs
- Browser console for frontend errors
- Server logs for backend errors
- Database files in `./db/` directory

## Legal Notice

**IMPORTANT**: Online gambling is heavily regulated. Before launching:
- Check gambling laws in your jurisdiction
- Obtain necessary licenses and permits
- Implement age verification
- Set up responsible gambling measures
- Consult with a lawyer specializing in gambling law

This is a demo application. Use at your own risk.

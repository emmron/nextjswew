const Bet = require('../models/bet')
const Event = require('../models/event')
const Wallet = require('../models/wallet')
const House = require('../models/house')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

module.exports = (expressApp) => {
  if (expressApp === null) {
    throw new Error('expressApp option must be an express server instance')
  }

  // Get all upcoming events
  expressApp.get('/api/events', async (req, res) => {
    try {
      const events = await Event.findUpcoming()
      res.json({ events })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get all events (including live and finished)
  expressApp.get('/api/events/all', async (req, res) => {
    try {
      const events = await Event.findAll()
      res.json({ events })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get single event
  expressApp.get('/api/events/:id', async (req, res) => {
    try {
      const event = await Event.findById(req.params.id)
      if (!event) {
        return res.status(404).json({ error: 'Event not found' })
      }
      res.json({ event })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get maximum allowed bet for given odds
  expressApp.get('/api/bets/max-bet/:odds', async (req, res) => {
    try {
      const odds = parseFloat(req.params.odds)
      const maxBet = await House.calculateMaxBet(odds)
      const houseBalance = await House.getBalance()

      res.json({
        maxBet,
        houseBalance: houseBalance.balance,
        message: `Maximum bet: $${maxBet} (House protects 10% max risk per bet)`
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Place a bet with risk management
  expressApp.post('/api/bets/place', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      // Check if membership is paid
      const wallet = await Wallet.findByUserId(req.user.id)
      if (!wallet.membershipPaid) {
        return res.status(403).json({ error: 'Please pay the membership fee first' })
      }

      const { eventId, selection, amount, odds } = req.body

      if (!eventId || !selection || !amount || !odds) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const betAmount = parseFloat(amount)
      const betOdds = parseFloat(odds)
      const potentialWin = betAmount * betOdds

      // CRITICAL: Check if house can afford to pay this bet if it wins
      const maxBet = await House.calculateMaxBet(betOdds)
      if (betAmount > maxBet) {
        return res.status(400).json({
          error: `Bet too large. Maximum bet for these odds is $${maxBet}`,
          maxBet,
          reason: 'House risk management - protecting bankroll'
        })
      }

      // Check if house has enough to pay potential winnings
      const house = await House.getBalance()
      const potentialPayout = potentialWin
      if (potentialPayout > house.balance * 0.5) {
        return res.status(400).json({
          error: 'Bet amount too high for current house bankroll',
          maxSafeBet: Math.floor((house.balance * 0.5) / betOdds),
          reason: 'Insufficient house funds to guarantee payout'
        })
      }

      // Verify event exists and is open for betting
      const event = await Event.findById(eventId)
      if (!event) {
        return res.status(404).json({ error: 'Event not found' })
      }

      if (event.status !== 'upcoming') {
        return res.status(400).json({ error: 'Event is not open for betting' })
      }

      // Minimum bet check
      if (betAmount < 5) {
        return res.status(400).json({ error: 'Minimum bet is $5' })
      }

      // Deduct funds from user wallet
      await Wallet.deductFunds(req.user.id, betAmount)

      // Add funds to house (house receives the bet amount)
      await House.receiveBet(betAmount)

      // Create bet
      const bet = await Bet.create({
        userId: req.user.id,
        userEmail: req.user.email,
        eventId,
        eventName: event.name,
        selection,
        amount: betAmount,
        odds: betOdds,
        potentialWin,
        status: 'active',
        createdAt: new Date()
      })

      res.json({
        bet,
        message: 'Bet placed successfully',
        houseBalance: (await House.getBalance()).balance
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get user's bets
  expressApp.get('/api/bets/my-bets', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const bets = await Bet.findByUserId(req.user.id)
      res.json({ bets })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get user's active bets
  expressApp.get('/api/bets/active', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const bets = await Bet.findActive(req.user.id)
      res.json({ bets })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get wallet balance
  expressApp.get('/api/wallet/balance', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const wallet = await Wallet.findByUserId(req.user.id)
      res.json({ balance: wallet.balance })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Create Stripe checkout session for membership signup fee
  expressApp.post('/api/wallet/create-membership-session', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const MEMBERSHIP_FEE = parseFloat(process.env.MEMBERSHIP_FEE || '10')

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Membership Fee',
                description: 'One-time signup fee to activate your betting account',
              },
              unit_amount: Math.round(MEMBERSHIP_FEE * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin || 'http://localhost:3000'}/wallet?membership=success`,
        cancel_url: `${req.headers.origin || 'http://localhost:3000'}/wallet`,
        client_reference_id: req.user.id,
        metadata: {
          userId: req.user.id,
          type: 'membership'
        }
      })

      res.json({ sessionId: session.id, url: session.url })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Check membership status
  expressApp.get('/api/wallet/membership-status', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const wallet = await Wallet.findByUserId(req.user.id)
      res.json({ isPaid: wallet.membershipPaid || false })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Create Stripe checkout session for deposit
  expressApp.post('/api/wallet/create-checkout-session', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      // Check if membership is paid
      const wallet = await Wallet.findByUserId(req.user.id)
      if (!wallet.membershipPaid) {
        return res.status(403).json({ error: 'Please pay the membership fee first' })
      }

      const { amount } = req.body

      if (!amount || amount < 5) {
        return res.status(400).json({ error: 'Minimum deposit is $5' })
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Wallet Deposit',
                description: `Add $${amount} to your betting wallet`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin || 'http://localhost:3000'}/wallet?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'http://localhost:3000'}/wallet`,
        client_reference_id: req.user.id,
        metadata: {
          userId: req.user.id,
          amount: amount.toString(),
          type: 'deposit'
        }
      })

      res.json({ sessionId: session.id, url: session.url })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Webhook to handle successful payment
  expressApp.post('/api/webhook/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature']
    let event

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata.userId || session.client_reference_id

      if (session.metadata.type === 'membership') {
        // Mark membership as paid and ADD TO HOUSE BANKROLL
        if (userId) {
          const MEMBERSHIP_FEE = parseFloat(process.env.MEMBERSHIP_FEE || '10')
          const wallet = await Wallet.findByUserId(userId)
          await Wallet.db.update(
            { userId },
            { $set: { membershipPaid: true, membershipPaidAt: new Date() } },
            {}
          )
          // CRITICAL: Add membership fee to house bankroll (pure profit!)
          await House.addMembershipFee(MEMBERSHIP_FEE)
        }
      } else if (session.metadata.type === 'deposit') {
        // Add funds to user's wallet (user money, not house profit)
        const amount = parseFloat(session.metadata.amount)
        if (userId && amount) {
          await Wallet.addFunds(userId, amount)
        }
      }
    }

    res.json({ received: true })
  })

  // Admin: Create event
  expressApp.post('/api/admin/events/create', async (req, res) => {
    if (!req.user || !req.user.admin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    try {
      const event = await Event.create(req.body)
      res.json({ event, message: 'Event created successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Admin: Update event
  expressApp.put('/api/admin/events/:id', async (req, res) => {
    if (!req.user || !req.user.admin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    try {
      await Event.update(req.params.id, req.body)
      res.json({ message: 'Event updated successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Admin: Settle bets for an event with house bankroll management
  expressApp.post('/api/admin/events/:id/settle', async (req, res) => {
    if (!req.user || !req.user.admin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    try {
      const { winner } = req.body
      const eventId = req.params.id

      // Update event status
      await Event.update(eventId, { status: 'finished', winner })

      // Get all bets for this event
      const bets = await Bet.findByEventId(eventId)

      let totalPayout = 0
      let winners = []
      let losers = []

      // Calculate total payout needed
      for (const bet of bets) {
        if (bet.selection === winner) {
          totalPayout += bet.potentialWin
          winners.push(bet)
        } else {
          losers.push(bet)
        }
      }

      // Check if house can afford payouts
      const house = await House.getBalance()
      if (totalPayout > house.balance) {
        return res.status(400).json({
          error: 'INSUFFICIENT HOUSE FUNDS',
          houseBalance: house.balance,
          requiredPayout: totalPayout,
          shortfall: totalPayout - house.balance,
          message: 'Cannot settle - house cannot afford to pay all winners. Add more funds or adjust bets.'
        })
      }

      // Settle each bet
      for (const bet of winners) {
        // Winner - pay out from house
        await Bet.settle(bet._id, 'won')
        await Wallet.addFunds(bet.userId, bet.potentialWin)
        await House.payout(bet.potentialWin)
      }

      for (const bet of losers) {
        // Loser - house keeps the bet amount (already added when bet was placed)
        await Bet.settle(bet._id, 'lost')
      }

      const finalHouse = await House.getBalance()

      res.json({
        message: 'Bets settled successfully',
        winners: winners.length,
        losers: losers.length,
        totalPayout,
        houseBalanceBefore: house.balance,
        houseBalanceAfter: finalHouse.balance,
        profit: finalHouse.profit
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Admin: Get house financial stats
  expressApp.get('/api/admin/house/stats', async (req, res) => {
    if (!req.user || !req.user.admin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    try {
      const stats = await House.getStats()
      res.json(stats)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Admin: Delete event
  expressApp.delete('/api/admin/events/:id', async (req, res) => {
    if (!req.user || !req.user.admin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    try {
      await Event.delete(req.params.id)
      res.json({ message: 'Event deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
}

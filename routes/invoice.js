const Invoice = require('../models/invoice')
const Client = require('../models/client')
const Subscription = require('../models/subscription')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

module.exports = (expressApp) => {
  if (expressApp === null) {
    throw new Error('expressApp option must be an express server instance')
  }

  // Get user's subscription info
  expressApp.get('/api/subscription', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const sub = await Subscription.findByUserId(req.user.id)
      const currentMonth = new Date()
      const count = await Invoice.countByUserId(req.user.id, currentMonth)

      res.json({
        subscription: sub,
        invoiceCount: count,
        remaining: sub.invoiceLimit === -1 ? 'Unlimited' : Math.max(0, sub.invoiceLimit - count)
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Create Stripe checkout for subscription
  expressApp.post('/api/subscription/checkout', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const { plan } = req.body

      const prices = {
        starter: { amount: 1000, name: 'Starter Plan - 25 invoices/month' },
        pro: { amount: 2000, name: 'Pro Plan - Unlimited invoices' },
        business: { amount: 3000, name: 'Business Plan - Unlimited + Team' }
      }

      if (!prices[plan]) {
        return res.status(400).json({ error: 'Invalid plan' })
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: prices[plan].name,
              },
              unit_amount: prices[plan].amount,
              recurring: {
                interval: 'month'
              }
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin || 'http://localhost:3000'}/dashboard?upgraded=true`,
        cancel_url: `${req.headers.origin || 'http://localhost:3000'}/pricing`,
        client_reference_id: req.user.id,
        metadata: {
          userId: req.user.id,
          plan
        }
      })

      res.json({ sessionId: session.id, url: session.url })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Stripe webhook
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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata.userId || session.client_reference_id
      const plan = session.metadata.plan

      if (userId && plan) {
        const limits = {
          starter: 25,
          pro: -1, // Unlimited
          business: -1 // Unlimited
        }

        await Subscription.update(userId, {
          plan,
          status: 'active',
          invoiceLimit: limits[plan],
          stripeSubscriptionId: session.subscription
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      // Downgrade to free
      const subscription = event.data.object
      await Subscription.update(subscription.metadata.userId, {
        plan: 'free',
        status: 'active',
        invoiceLimit: 3
      })
    }

    res.json({ received: true })
  })

  // Get all invoices
  expressApp.get('/api/invoices', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const invoices = await Invoice.findByUserId(req.user.id)
      res.json({ invoices })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get single invoice
  expressApp.get('/api/invoices/:id', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const invoice = await Invoice.findById(req.params.id)
      if (!invoice || invoice.userId !== req.user.id) {
        return res.status(404).json({ error: 'Invoice not found' })
      }
      res.json({ invoice })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Create invoice
  expressApp.post('/api/invoices', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      // Check if user can create invoice
      const canCreate = await Subscription.canCreateInvoice(req.user.id, new Date())
      if (!canCreate) {
        return res.status(403).json({
          error: 'Invoice limit reached',
          message: 'Upgrade your plan to create more invoices'
        })
      }

      const invoiceNumber = await Invoice.getNextInvoiceNumber(req.user.id)

      const invoice = await Invoice.create({
        ...req.body,
        userId: req.user.id,
        invoiceNumber,
        status: req.body.status || 'unpaid'
      })

      res.json({ invoice })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Update invoice
  expressApp.put('/api/invoices/:id', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const invoice = await Invoice.findById(req.params.id)
      if (!invoice || invoice.userId !== req.user.id) {
        return res.status(404).json({ error: 'Invoice not found' })
      }

      await Invoice.update(req.params.id, req.body)
      res.json({ message: 'Invoice updated successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Delete invoice
  expressApp.delete('/api/invoices/:id', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const invoice = await Invoice.findById(req.params.id)
      if (!invoice || invoice.userId !== req.user.id) {
        return res.status(404).json({ error: 'Invoice not found' })
      }

      await Invoice.delete(req.params.id)
      res.json({ message: 'Invoice deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get all clients
  expressApp.get('/api/clients', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const clients = await Client.findByUserId(req.user.id)
      res.json({ clients })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Create client
  expressApp.post('/api/clients', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const client = await Client.create({
        ...req.body,
        userId: req.user.id
      })
      res.json({ client })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Update client
  expressApp.put('/api/clients/:id', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const client = await Client.findById(req.params.id)
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ error: 'Client not found' })
      }

      await Client.update(req.params.id, req.body)
      res.json({ message: 'Client updated successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Delete client
  expressApp.delete('/api/clients/:id', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const client = await Client.findById(req.params.id)
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ error: 'Client not found' })
      }

      await Client.delete(req.params.id)
      res.json({ message: 'Client deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
}

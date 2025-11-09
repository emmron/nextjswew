const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Subscription = require('../../../models/subscription')

// Disable body parsing, need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper to get raw body
async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  try {
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

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      // Handle subscription updates if needed
    }

    if (event.type === 'customer.subscription.deleted') {
      // Downgrade to free
      const subscription = event.data.object
      const userId = subscription.metadata?.userId

      if (userId) {
        await Subscription.update(userId, {
          plan: 'free',
          status: 'active',
          invoiceLimit: 3
        })
      }
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

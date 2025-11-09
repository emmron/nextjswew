import { getSession } from 'next-auth/client'
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check authentication
  const session = await getSession({ req })
  if (!session || !session.user) {
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

    const checkoutSession = await stripe.checkout.sessions.create({
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
      success_url: `${req.headers.origin || process.env.SERVER_URL}/dashboard?upgraded=true`,
      cancel_url: `${req.headers.origin || process.env.SERVER_URL}/pricing`,
      client_reference_id: session.user.id,
      metadata: {
        userId: session.user.id,
        plan
      }
    })

    res.status(200).json({ sessionId: checkoutSession.id, url: checkoutSession.url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

import { getSession } from 'next-auth/client'
const Subscription = require('../../models/subscription')
const Invoice = require('../../models/invoice')

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check authentication
  const session = await getSession({ req })
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const sub = await Subscription.findByUserId(session.user.id)
    const currentMonth = new Date()
    const count = await Invoice.countByUserId(session.user.id, currentMonth)

    res.status(200).json({
      subscription: sub,
      invoiceCount: count,
      remaining: sub.invoiceLimit === -1 ? 'Unlimited' : Math.max(0, sub.invoiceLimit - count)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

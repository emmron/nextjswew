import { getSession } from 'next-auth/client'
const Invoice = require('../../../models/invoice')
const Subscription = require('../../../models/subscription')

export default async function handler(req, res) {
  // Check authentication
  const session = await getSession({ req })
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (req.method === 'GET') {
    // Get all invoices for user
    try {
      const invoices = await Invoice.findByUserId(session.user.id)
      res.status(200).json({ invoices })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    // Create new invoice
    try {
      // Check if user can create invoice
      const canCreate = await Subscription.canCreateInvoice(session.user.id, new Date())
      if (!canCreate) {
        return res.status(403).json({
          error: 'Invoice limit reached',
          message: 'Upgrade your plan to create more invoices'
        })
      }

      const invoiceNumber = await Invoice.getNextInvoiceNumber(session.user.id)

      const invoice = await Invoice.create({
        ...req.body,
        userId: session.user.id,
        invoiceNumber,
        status: req.body.status || 'unpaid'
      })

      res.status(201).json({ invoice })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

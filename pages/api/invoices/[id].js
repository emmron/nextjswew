import { getSession } from 'next-auth/client'
const Invoice = require('../../../models/invoice')

export default async function handler(req, res) {
  const { id } = req.query

  // Check authentication
  const session = await getSession({ req })
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Verify invoice belongs to user
  let invoice
  try {
    invoice = await Invoice.findById(id)
    if (!invoice || invoice.userId !== session.user.id) {
      return res.status(404).json({ error: 'Invoice not found' })
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }

  if (req.method === 'GET') {
    // Get single invoice
    res.status(200).json({ invoice })
  } else if (req.method === 'PUT') {
    // Update invoice
    try {
      await Invoice.update(id, req.body)
      res.status(200).json({ message: 'Invoice updated successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'DELETE') {
    // Delete invoice
    try {
      await Invoice.delete(id)
      res.status(200).json({ message: 'Invoice deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

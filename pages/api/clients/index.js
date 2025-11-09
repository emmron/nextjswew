import { getSession } from 'next-auth/client'
const Client = require('../../../models/client')

export default async function handler(req, res) {
  // Check authentication
  const session = await getSession({ req })
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (req.method === 'GET') {
    // Get all clients for user
    try {
      const clients = await Client.findByUserId(session.user.id)
      res.status(200).json({ clients })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    // Create new client
    try {
      const client = await Client.create({
        ...req.body,
        userId: session.user.id
      })
      res.status(201).json({ client })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

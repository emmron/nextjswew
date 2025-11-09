import { getSession } from 'next-auth/client'
const Client = require('../../../models/client')

export default async function handler(req, res) {
  const { id } = req.query

  // Check authentication
  const session = await getSession({ req })
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Verify client belongs to user
  let client
  try {
    client = await Client.findById(id)
    if (!client || client.userId !== session.user.id) {
      return res.status(404).json({ error: 'Client not found' })
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }

  if (req.method === 'PUT') {
    // Update client
    try {
      await Client.update(id, req.body)
      res.status(200).json({ message: 'Client updated successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'DELETE') {
    // Delete client
    try {
      await Client.delete(id)
      res.status(200).json({ message: 'Client deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

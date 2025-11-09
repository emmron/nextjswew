/**
 * Client Model - Improved Version
 * Features:
 * - Works with both NeDB and MongoDB
 * - Better validation
 * - Search and filtering
 * - Statistics
 */

const { createAdapter } = require('../lib/database')
const { validateClient } = require('../lib/validation')

class ClientModel {
  constructor() {
    this.db = createAdapter('clients')
    this._initializeIndexes()
  }

  /**
   * Initialize database indexes
   * @private
   */
  async _initializeIndexes() {
    try {
      await this.db.createIndex({ userId: 1, createdAt: -1 })
      await this.db.createIndex({ userId: 1, name: 1 })
      await this.db.createIndex({ email: 1 })
    } catch (error) {
      console.warn('Failed to create indexes:', error.message)
    }
  }

  /**
   * Create a new client
   * @param {Object} clientData - Client data
   * @returns {Promise<Object>} Created client
   */
  async create(clientData) {
    try {
      // Validate input
      const validatedData = validateClient(clientData)

      // Create client
      const client = await this.db.insertOne(validatedData)

      return client
    } catch (error) {
      console.error('Error creating client:', error)
      throw error
    }
  }

  /**
   * Find client by ID
   * @param {String} id - Client ID
   * @returns {Promise<Object|null>} Client or null
   */
  async findById(id) {
    try {
      return await this.db.findById(id)
    } catch (error) {
      console.error('Error finding client by ID:', error)
      return null
    }
  }

  /**
   * Find all clients for a user
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of clients
   */
  async findByUserId(userId, options = {}) {
    try {
      const query = { userId }

      const queryOptions = {
        sort: { name: 1 }, // Alphabetical order
        limit: options.limit || 1000,
        skip: options.skip || 0,
      }

      return await this.db.find(query, queryOptions)
    } catch (error) {
      console.error('Error finding clients by user ID:', error)
      return []
    }
  }

  /**
   * Find client by email
   * @param {String} userId - User ID
   * @param {String} email - Client email
   * @returns {Promise<Object|null>} Client or null
   */
  async findByEmail(userId, email) {
    try {
      return await this.db.findOne({ userId, email: email.toLowerCase() })
    } catch (error) {
      console.error('Error finding client by email:', error)
      return null
    }
  }

  /**
   * Update client
   * @param {String} id - Client ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Update result
   */
  async update(id, updates) {
    try {
      // Don't allow updating certain fields
      delete updates.userId
      delete updates.createdAt

      // Validate updates
      if (updates.name || updates.email || updates.address || updates.phone) {
        const validatedUpdates = validateClient({
          name: updates.name || 'Placeholder', // Need name for validation
          ...updates,
        })

        // Remove placeholder if it was added
        if (!updates.name) {
          delete validatedUpdates.name
        }

        return await this.db.updateById(id, validatedUpdates)
      }

      return await this.db.updateById(id, updates)
    } catch (error) {
      console.error('Error updating client:', error)
      throw error
    }
  }

  /**
   * Delete client
   * @param {String} id - Client ID
   * @returns {Promise<Object>} Delete result
   */
  async delete(id) {
    try {
      return await this.db.deleteById(id)
    } catch (error) {
      console.error('Error deleting client:', error)
      throw error
    }
  }

  /**
   * Search clients
   * @param {String} userId - User ID
   * @param {String} searchTerm - Search term
   * @returns {Promise<Array>} Matching clients
   */
  async search(userId, searchTerm) {
    try {
      const allClients = await this.findByUserId(userId)

      if (!searchTerm) return allClients

      const term = searchTerm.toLowerCase()

      return allClients.filter((client) => {
        return (
          (client.name && client.name.toLowerCase().includes(term)) ||
          (client.email && client.email.toLowerCase().includes(term)) ||
          (client.phone && client.phone.toLowerCase().includes(term)) ||
          (client.address && client.address.toLowerCase().includes(term))
        )
      })
    } catch (error) {
      console.error('Error searching clients:', error)
      return []
    }
  }

  /**
   * Get client statistics
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Client statistics
   */
  async getStatistics(userId) {
    try {
      const clients = await this.findByUserId(userId)
      const Invoice = require('./invoice')
      const invoices = await Invoice.findByUserId(userId)

      // Count invoices per client
      const clientInvoiceCount = {}
      const clientRevenue = {}

      invoices.forEach((invoice) => {
        const clientKey = invoice.clientName || 'Unknown'

        clientInvoiceCount[clientKey] = (clientInvoiceCount[clientKey] || 0) + 1

        if (invoice.status === 'paid') {
          clientRevenue[clientKey] = (clientRevenue[clientKey] || 0) + (invoice.total || 0)
        }
      })

      return {
        total: clients.length,
        withEmail: clients.filter((c) => c.email).length,
        withPhone: clients.filter((c) => c.phone).length,
        withAddress: clients.filter((c) => c.address).length,
        topClients: Object.entries(clientInvoiceCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({
            name,
            invoiceCount: count,
            revenue: Math.round((clientRevenue[name] || 0) * 100) / 100,
          })),
      }
    } catch (error) {
      console.error('Error getting client statistics:', error)
      return {
        total: 0,
        withEmail: 0,
        withPhone: 0,
        withAddress: 0,
        topClients: [],
      }
    }
  }

  /**
   * Count total clients for user
   * @param {String} userId - User ID
   * @returns {Promise<Number>} Client count
   */
  async count(userId) {
    try {
      return await this.db.count({ userId })
    } catch (error) {
      console.error('Error counting clients:', error)
      return 0
    }
  }

  /**
   * Get recent clients
   * @param {String} userId - User ID
   * @param {Number} limit - Number of clients to return
   * @returns {Promise<Array>} Recent clients
   */
  async getRecent(userId, limit = 5) {
    try {
      return await this.db.find({ userId }, { sort: { createdAt: -1 }, limit })
    } catch (error) {
      console.error('Error getting recent clients:', error)
      return []
    }
  }
}

module.exports = new ClientModel()

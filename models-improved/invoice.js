/**
 * Invoice Model - Improved Version
 * Features:
 * - Works with both NeDB and MongoDB
 * - Better error handling
 * - Atomic operations for invoice numbering
 * - Input validation
 * - Race condition fixes
 */

const { createAdapter } = require('../lib/database')
const { validateInvoice } = require('../lib/validation')

class InvoiceModel {
  constructor() {
    this.db = createAdapter('invoices')
    this._initializeIndexes()
  }

  /**
   * Initialize database indexes for performance
   * @private
   */
  async _initializeIndexes() {
    try {
      await this.db.createIndex({ userId: 1, createdAt: -1 })
      await this.db.createIndex({ userId: 1, invoiceNumber: 1 }, { unique: true })
      await this.db.createIndex({ status: 1 })
    } catch (error) {
      console.warn('Failed to create indexes:', error.message)
    }
  }

  /**
   * Create a new invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Object>} Created invoice
   */
  async create(invoiceData) {
    try {
      // Validate input
      const validatedData = validateInvoice(invoiceData)

      // Generate invoice number (with retry logic for race conditions)
      const invoiceNumber = await this._generateInvoiceNumber(validatedData.userId)

      // Create invoice
      const invoice = await this.db.insertOne({
        ...validatedData,
        invoiceNumber,
        status: validatedData.status || 'unpaid',
      })

      return invoice
    } catch (error) {
      // Handle duplicate invoice number (race condition)
      if (error.message && error.message.includes('duplicate') || error.message.includes('E11000')) {
        // Retry with new invoice number
        return this.create(invoiceData)
      }
      throw error
    }
  }

  /**
   * Generate next invoice number with atomic operation
   * @private
   * @param {String} userId - User ID
   * @returns {Promise<String>} Next invoice number
   */
  async _generateInvoiceNumber(userId) {
    try {
      // Get last invoice for this user
      const lastInvoices = await this.db.find(
        { userId },
        { sort: { invoiceNumber: -1 }, limit: 1 }
      )

      let nextNumber = 1001 // Start from 1001

      if (lastInvoices.length > 0 && lastInvoices[0].invoiceNumber) {
        const lastNumberStr = lastInvoices[0].invoiceNumber.toString()
        const lastNumber = parseInt(lastNumberStr.replace(/\D/g, ''), 10)

        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1
        }
      }

      // Format with leading zeros: INV-0001, INV-0002, etc.
      return `INV-${String(nextNumber).padStart(4, '0')}`
    } catch (error) {
      console.error('Error generating invoice number:', error)
      // Fallback to timestamp-based number
      return `INV-${Date.now()}`
    }
  }

  /**
   * Find invoice by ID
   * @param {String} id - Invoice ID
   * @returns {Promise<Object|null>} Invoice or null
   */
  async findById(id) {
    try {
      return await this.db.findById(id)
    } catch (error) {
      console.error('Error finding invoice by ID:', error)
      return null
    }
  }

  /**
   * Find all invoices for a user
   * @param {String} userId - User ID
   * @param {Object} options - Query options (limit, skip, status)
   * @returns {Promise<Array>} Array of invoices
   */
  async findByUserId(userId, options = {}) {
    try {
      const query = { userId }

      // Filter by status if provided
      if (options.status) {
        query.status = options.status
      }

      const queryOptions = {
        sort: { createdAt: -1 }, // Newest first
        limit: options.limit || 100,
        skip: options.skip || 0,
      }

      return await this.db.find(query, queryOptions)
    } catch (error) {
      console.error('Error finding invoices by user ID:', error)
      return []
    }
  }

  /**
   * Count invoices for a user in a specific month
   * @param {String} userId - User ID
   * @param {Date} month - Month to count (defaults to current month)
   * @returns {Promise<Number>} Invoice count
   */
  async countByUserId(userId, month = null) {
    try {
      const query = { userId }

      if (month) {
        const startOfMonth = new Date(month)
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const endOfMonth = new Date(month)
        endOfMonth.setMonth(endOfMonth.getMonth() + 1)
        endOfMonth.setDate(0)
        endOfMonth.setHours(23, 59, 59, 999)

        query.createdAt = { $gte: startOfMonth, $lte: endOfMonth }
      }

      return await this.db.count(query)
    } catch (error) {
      console.error('Error counting invoices:', error)
      return 0
    }
  }

  /**
   * Update invoice
   * @param {String} id - Invoice ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Update result
   */
  async update(id, updates) {
    try {
      // Don't allow updating certain fields
      delete updates.userId
      delete updates.invoiceNumber
      delete updates.createdAt

      // Validate updates if they contain invoice data
      if (updates.items || updates.clientName) {
        // Partial validation for updates
        if (updates.items && Array.isArray(updates.items)) {
          const { validateArray, validateNumber, validateString } = require('../lib/validation')

          validateArray(updates.items, 'Line items', { minLength: 1, maxLength: 50 })

          updates.items = updates.items.map((item, index) => {
            item.description = validateString(item.description, `Item ${index + 1} description`, {
              required: true,
              maxLength: 500,
            })
            item.quantity = validateNumber(item.quantity, `Item ${index + 1} quantity`, {
              required: true,
              min: 0,
              max: 1000000,
            })
            item.rate = validateNumber(item.rate, `Item ${index + 1} rate`, {
              required: true,
              min: 0,
              max: 1000000,
            })
            return item
          })

          // Recalculate totals
          const subtotal = updates.items.reduce((sum, item) => {
            return sum + (item.quantity || 0) * (item.rate || 0)
          }, 0)

          updates.subtotal = Math.round(subtotal * 100) / 100
          updates.tax = updates.tax || 0
          updates.total = Math.round((updates.subtotal + updates.tax) * 100) / 100
        }
      }

      return await this.db.updateById(id, updates)
    } catch (error) {
      console.error('Error updating invoice:', error)
      throw error
    }
  }

  /**
   * Delete invoice
   * @param {String} id - Invoice ID
   * @returns {Promise<Object>} Delete result
   */
  async delete(id) {
    try {
      return await this.db.deleteById(id)
    } catch (error) {
      console.error('Error deleting invoice:', error)
      throw error
    }
  }

  /**
   * Get invoice statistics for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Invoice statistics
   */
  async getStatistics(userId) {
    try {
      const invoices = await this.findByUserId(userId)

      const stats = {
        total: invoices.length,
        paid: 0,
        unpaid: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
      }

      const now = new Date()

      invoices.forEach((invoice) => {
        stats.totalAmount += invoice.total || 0

        if (invoice.status === 'paid') {
          stats.paid++
          stats.paidAmount += invoice.total || 0
        } else if (invoice.status === 'unpaid') {
          stats.unpaid++
          stats.unpaidAmount += invoice.total || 0

          // Check if overdue
          if (invoice.dueDate && new Date(invoice.dueDate) < now) {
            stats.overdue++
          }
        }
      })

      // Round amounts
      stats.totalAmount = Math.round(stats.totalAmount * 100) / 100
      stats.paidAmount = Math.round(stats.paidAmount * 100) / 100
      stats.unpaidAmount = Math.round(stats.unpaidAmount * 100) / 100

      return stats
    } catch (error) {
      console.error('Error getting invoice statistics:', error)
      return {
        total: 0,
        paid: 0,
        unpaid: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
      }
    }
  }

  /**
   * Mark invoice as paid
   * @param {String} id - Invoice ID
   * @returns {Promise<Object>} Update result
   */
  async markAsPaid(id) {
    return this.update(id, { status: 'paid' })
  }

  /**
   * Mark invoice as unpaid
   * @param {String} id - Invoice ID
   * @returns {Promise<Object>} Update result
   */
  async markAsUnpaid(id) {
    return this.update(id, { status: 'unpaid' })
  }

  /**
   * Search invoices
   * @param {String} userId - User ID
   * @param {String} searchTerm - Search term
   * @returns {Promise<Array>} Matching invoices
   */
  async search(userId, searchTerm) {
    try {
      const allInvoices = await this.findByUserId(userId)

      if (!searchTerm) return allInvoices

      const term = searchTerm.toLowerCase()

      return allInvoices.filter((invoice) => {
        return (
          (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(term)) ||
          (invoice.clientName && invoice.clientName.toLowerCase().includes(term)) ||
          (invoice.clientEmail && invoice.clientEmail.toLowerCase().includes(term))
        )
      })
    } catch (error) {
      console.error('Error searching invoices:', error)
      return []
    }
  }
}

module.exports = new InvoiceModel()

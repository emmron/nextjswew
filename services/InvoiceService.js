/**
 * Invoice Service - Business Logic Layer
 * Orchestrates invoice operations with events, validation, caching, and state management
 */

const Invoice = require('../models-improved/invoice')
const Subscription = require('../models-improved/subscription')
const { validateInvoice } = require('../lib/validation')
const { InvoiceEvents } = require('../lib/events')
const { createInvoiceStateMachine } = require('../lib/state-machines')
const { cache, CacheKeys, CacheInvalidation } = require('../lib/cache')
const {
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  SubscriptionLimitError,
} = require('../lib/errors')

class InvoiceService {
  /**
   * Create a new invoice
   */
  async createInvoice(userId, invoiceData) {
    // Check subscription limits
    const subscription = await Subscription.findByUserId(userId)
    const canCreate = await Subscription.canCreateInvoice(userId, new Date())

    if (!canCreate) {
      const usage = await Subscription.getUsage(userId)

      // Emit event for analytics/notifications
      const { SubscriptionEvents } = require('../lib/events')
      SubscriptionEvents.limitReached(userId, usage.limit, usage.used)

      throw new SubscriptionLimitError(usage.plan, usage.limit, usage.used)
    }

    // Validate invoice data
    const validatedData = validateInvoice(invoiceData)

    // Create invoice with validated data
    const invoice = await Invoice.create({
      ...validatedData,
      userId,
    })

    // Emit event
    InvoiceEvents.created(invoice)

    // Invalidate caches
    CacheInvalidation.invalidateInvoices(userId)

    return invoice
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(userId, invoiceId) {
    // Try cache first
    const cacheKey = CacheKeys.invoice(userId, invoiceId)
    const cached = cache.get(cacheKey)

    if (cached) {
      return cached
    }

    // Fetch from database
    const invoice = await Invoice.findById(invoiceId)

    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId)
    }

    // Verify ownership
    if (invoice.userId !== userId) {
      throw new AuthorizationError('You do not own this invoice', 'invoice')
    }

    // Cache it
    cache.set(cacheKey, invoice, 300) // 5 minutes

    return invoice
  }

  /**
   * Get all invoices for user
   */
  async getInvoices(userId, options = {}) {
    const cacheKey = CacheKeys.invoices(userId)

    return await cache.getOrSet(
      cacheKey,
      async () => await Invoice.findByUserId(userId, options),
      300 // 5 minutes
    )
  }

  /**
   * Update invoice
   */
  async updateInvoice(userId, invoiceId, updates) {
    // Get existing invoice
    const invoice = await this.getInvoice(userId, invoiceId)

    // Check if invoice can be edited using state machine
    const stateMachine = createInvoiceStateMachine(invoice.status)

    if (!stateMachine.canEdit()) {
      throw new BusinessRuleError(
        `Cannot edit invoice in '${invoice.status}' status`,
        'INVOICE_NOT_EDITABLE'
      )
    }

    // Update invoice
    await Invoice.update(invoiceId, updates)

    // Get updated invoice
    const updatedInvoice = await Invoice.findById(invoiceId)

    // Emit event
    InvoiceEvents.updated(updatedInvoice, updates)

    // Invalidate caches
    CacheInvalidation.invalidateInvoices(userId)

    return updatedInvoice
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(userId, invoiceId) {
    // Get invoice (verifies ownership)
    const invoice = await this.getInvoice(userId, invoiceId)

    // Check if can be deleted
    const stateMachine = createInvoiceStateMachine(invoice.status)

    if (stateMachine.isTerminal() && invoice.status === 'paid') {
      throw new BusinessRuleError(
        'Cannot delete paid invoices. Consider marking as refunded instead.',
        'CANNOT_DELETE_PAID_INVOICE'
      )
    }

    // Delete invoice
    await Invoice.delete(invoiceId)

    // Emit event
    InvoiceEvents.deleted(invoice)

    // Invalidate caches
    CacheInvalidation.invalidateInvoices(userId)

    return { success: true, invoiceId }
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(userId, invoiceId, paymentDetails = {}) {
    // Get invoice
    const invoice = await this.getInvoice(userId, invoiceId)

    // Use state machine to validate transition
    const stateMachine = createInvoiceStateMachine(invoice.status)

    if (!stateMachine.canBePaid()) {
      throw new BusinessRuleError(
        `Invoice in '${invoice.status}' status cannot be marked as paid`,
        'INVALID_STATUS_FOR_PAYMENT'
      )
    }

    // Transition state
    const newStatus = stateMachine.markAsPaid(paymentDetails)

    // Update invoice
    await Invoice.update(invoiceId, {
      status: newStatus,
      paidAt: new Date(),
      paymentDetails,
    })

    // Get updated invoice
    const updatedInvoice = await Invoice.findById(invoiceId)

    // Emit event
    InvoiceEvents.paid(updatedInvoice)

    // Invalidate caches
    CacheInvalidation.invalidateInvoices(userId)

    return updatedInvoice
  }

  /**
   * Mark invoice as unpaid
   */
  async markAsUnpaid(userId, invoiceId) {
    // Get invoice
    const invoice = await this.getInvoice(userId, invoiceId)

    // Check current status
    if (invoice.status === 'unpaid') {
      return invoice // Already unpaid
    }

    // Update invoice
    await Invoice.update(invoiceId, {
      status: 'unpaid',
      paidAt: null,
    })

    // Get updated invoice
    const updatedInvoice = await Invoice.findById(invoiceId)

    // Emit event
    InvoiceEvents.updated(updatedInvoice, { status: 'unpaid' })

    // Invalidate caches
    CacheInvalidation.invalidateInvoices(userId)

    return updatedInvoice
  }

  /**
   * Get invoice statistics
   */
  async getStatistics(userId) {
    const cacheKey = CacheKeys.invoiceStats(userId)

    return await cache.getOrSet(
      cacheKey,
      async () => await Invoice.getStatistics(userId),
      600 // 10 minutes
    )
  }

  /**
   * Search invoices
   */
  async searchInvoices(userId, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      return await this.getInvoices(userId)
    }

    return await Invoice.search(userId, searchTerm)
  }

  /**
   * Check overdue invoices and mark them
   */
  async processOverdueInvoices(userId) {
    const invoices = await this.getInvoices(userId, { status: 'unpaid' })
    const now = new Date()
    const overdueInvoices = []

    for (const invoice of invoices) {
      if (invoice.dueDate && new Date(invoice.dueDate) < now) {
        // Use state machine
        const stateMachine = createInvoiceStateMachine(invoice.status)

        if (stateMachine.canTransitionTo('overdue')) {
          stateMachine.markAsOverdue()

          // Update invoice
          await Invoice.update(invoice._id, {
            status: 'overdue',
          })

          // Emit event
          InvoiceEvents.overdue(invoice)

          overdueInvoices.push(invoice)
        }
      }
    }

    // Invalidate cache if any invoices were updated
    if (overdueInvoices.length > 0) {
      CacheInvalidation.invalidateInvoices(userId)
    }

    return overdueInvoices
  }

  /**
   * Batch create invoices
   */
  async batchCreateInvoices(userId, invoicesData) {
    const created = []
    const errors = []

    for (let i = 0; i < invoicesData.length; i++) {
      try {
        const invoice = await this.createInvoice(userId, invoicesData[i])
        created.push(invoice)
      } catch (error) {
        errors.push({
          index: i,
          data: invoicesData[i],
          error: error.message,
        })
      }
    }

    return {
      created,
      errors,
      total: invoicesData.length,
      successful: created.length,
      failed: errors.length,
    }
  }

  /**
   * Export invoices to CSV/JSON
   */
  async exportInvoices(userId, format = 'json') {
    const invoices = await this.getInvoices(userId)

    if (format === 'csv') {
      return this._exportToCSV(invoices)
    }

    return invoices
  }

  /**
   * Export invoices to CSV format
   * @private
   */
  _exportToCSV(invoices) {
    const headers = [
      'Invoice Number',
      'Client Name',
      'Date',
      'Due Date',
      'Total',
      'Status',
    ]

    const rows = invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.clientName,
      invoice.date,
      invoice.dueDate || 'N/A',
      invoice.total,
      invoice.status,
    ])

    return {
      headers,
      rows,
      csv: [headers, ...rows].map((row) => row.join(',')).join('\n'),
    }
  }
}

module.exports = new InvoiceService()

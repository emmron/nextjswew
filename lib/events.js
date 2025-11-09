/**
 * Event System - Event-Driven Architecture
 * Decouples components and enables reactive programming
 */

const EventEmitter = require('events')

// Event type constants
const EVENTS = {
  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_UPDATED: 'invoice.updated',
  INVOICE_DELETED: 'invoice.deleted',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',

  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_LIMIT_REACHED: 'subscription.limit_reached',

  // Client events
  CLIENT_CREATED: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  CLIENT_DELETED: 'client.deleted',

  // Payment events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // User events
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  // System events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
}

/**
 * Application Event Emitter
 */
class AppEventEmitter extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(50) // Increase for production
    this._eventLog = []
    this._logEnabled = process.env.EVENT_LOGGING === 'true'
  }

  /**
   * Emit event with automatic logging
   */
  emit(eventName, data = {}) {
    const event = {
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
    }

    // Log event if enabled
    if (this._logEnabled) {
      this._eventLog.push(event)
      console.log('[EVENT]', eventName, JSON.stringify(data, null, 2))
    }

    return super.emit(eventName, event)
  }

  /**
   * Get recent events (for debugging)
   */
  getRecentEvents(limit = 100) {
    return this._eventLog.slice(-limit)
  }

  /**
   * Clear event log
   */
  clearLog() {
    this._eventLog = []
  }

  /**
   * Get event statistics
   */
  getStatistics() {
    const stats = {}
    this._eventLog.forEach(event => {
      stats[event.name] = (stats[event.name] || 0) + 1
    })
    return stats
  }
}

// Singleton instance
const eventBus = new AppEventEmitter()

/**
 * Event Handler Registry - Register handlers for specific events
 */
class EventHandlers {
  /**
   * Handle invoice creation
   */
  static onInvoiceCreated(handler) {
    eventBus.on(EVENTS.INVOICE_CREATED, async (event) => {
      try {
        await handler(event.data)
      } catch (error) {
        console.error('Error handling INVOICE_CREATED:', error)
        eventBus.emit(EVENTS.SYSTEM_ERROR, { error: error.message, event: event.name })
      }
    })
  }

  /**
   * Handle invoice paid
   */
  static onInvoicePaid(handler) {
    eventBus.on(EVENTS.INVOICE_PAID, async (event) => {
      try {
        await handler(event.data)
      } catch (error) {
        console.error('Error handling INVOICE_PAID:', error)
        eventBus.emit(EVENTS.SYSTEM_ERROR, { error: error.message, event: event.name })
      }
    })
  }

  /**
   * Handle subscription upgraded
   */
  static onSubscriptionUpgraded(handler) {
    eventBus.on(EVENTS.SUBSCRIPTION_UPGRADED, async (event) => {
      try {
        await handler(event.data)
      } catch (error) {
        console.error('Error handling SUBSCRIPTION_UPGRADED:', error)
        eventBus.emit(EVENTS.SYSTEM_ERROR, { error: error.message, event: event.name })
      }
    })
  }

  /**
   * Handle subscription limit reached
   */
  static onSubscriptionLimitReached(handler) {
    eventBus.on(EVENTS.SUBSCRIPTION_LIMIT_REACHED, async (event) => {
      try {
        await handler(event.data)
      } catch (error) {
        console.error('Error handling SUBSCRIPTION_LIMIT_REACHED:', error)
        eventBus.emit(EVENTS.SYSTEM_ERROR, { error: error.message, event: event.name })
      }
    })
  }

  /**
   * Handle payment succeeded
   */
  static onPaymentSucceeded(handler) {
    eventBus.on(EVENTS.PAYMENT_SUCCEEDED, async (event) => {
      try {
        await handler(event.data)
      } catch (error) {
        console.error('Error handling PAYMENT_SUCCEEDED:', error)
        eventBus.emit(EVENTS.SYSTEM_ERROR, { error: error.message, event: event.name })
      }
    })
  }

  /**
   * Handle system errors
   */
  static onSystemError(handler) {
    eventBus.on(EVENTS.SYSTEM_ERROR, async (event) => {
      try {
        await handler(event.data)
      } catch (error) {
        console.error('Error handling SYSTEM_ERROR:', error)
      }
    })
  }
}

/**
 * Setup default event handlers
 */
function setupDefaultHandlers() {
  // Log all invoice creations
  EventHandlers.onInvoiceCreated((data) => {
    console.log(`✓ Invoice ${data.invoiceNumber} created for user ${data.userId}`)
  })

  // Send notification when invoice is paid
  EventHandlers.onInvoicePaid((data) => {
    console.log(`💰 Invoice ${data.invoiceNumber} marked as paid: $${data.total}`)
    // TODO: Send email notification
  })

  // Track subscription upgrades
  EventHandlers.onSubscriptionUpgraded((data) => {
    console.log(`📈 User ${data.userId} upgraded to ${data.newPlan} plan`)
    // TODO: Send welcome email for new plan
  })

  // Alert when subscription limit reached
  EventHandlers.onSubscriptionLimitReached((data) => {
    console.log(`⚠️  User ${data.userId} reached invoice limit (${data.limit})`)
    // TODO: Send upgrade prompt email
  })

  // Log system errors
  EventHandlers.onSystemError((data) => {
    console.error(`❌ System error in ${data.event}:`, data.error)
    // TODO: Send to error tracking service (Sentry, etc.)
  })
}

/**
 * Emit invoice events
 */
const InvoiceEvents = {
  created: (invoice) => eventBus.emit(EVENTS.INVOICE_CREATED, invoice),
  updated: (invoice, changes) => eventBus.emit(EVENTS.INVOICE_UPDATED, { invoice, changes }),
  deleted: (invoice) => eventBus.emit(EVENTS.INVOICE_DELETED, invoice),
  paid: (invoice) => eventBus.emit(EVENTS.INVOICE_PAID, invoice),
  overdue: (invoice) => eventBus.emit(EVENTS.INVOICE_OVERDUE, invoice),
}

/**
 * Emit subscription events
 */
const SubscriptionEvents = {
  created: (subscription) => eventBus.emit(EVENTS.SUBSCRIPTION_CREATED, subscription),
  upgraded: (subscription, oldPlan, newPlan) => {
    eventBus.emit(EVENTS.SUBSCRIPTION_UPGRADED, {
      ...subscription,
      oldPlan,
      newPlan,
    })
  },
  downgraded: (subscription, oldPlan, newPlan) => {
    eventBus.emit(EVENTS.SUBSCRIPTION_DOWNGRADED, {
      ...subscription,
      oldPlan,
      newPlan,
    })
  },
  cancelled: (subscription) => eventBus.emit(EVENTS.SUBSCRIPTION_CANCELLED, subscription),
  renewed: (subscription) => eventBus.emit(EVENTS.SUBSCRIPTION_RENEWED, subscription),
  limitReached: (userId, limit, used) => {
    eventBus.emit(EVENTS.SUBSCRIPTION_LIMIT_REACHED, { userId, limit, used })
  },
}

/**
 * Emit client events
 */
const ClientEvents = {
  created: (client) => eventBus.emit(EVENTS.CLIENT_CREATED, client),
  updated: (client, changes) => eventBus.emit(EVENTS.CLIENT_UPDATED, { client, changes }),
  deleted: (client) => eventBus.emit(EVENTS.CLIENT_DELETED, client),
}

/**
 * Emit payment events
 */
const PaymentEvents = {
  succeeded: (payment) => eventBus.emit(EVENTS.PAYMENT_SUCCEEDED, payment),
  failed: (payment, error) => eventBus.emit(EVENTS.PAYMENT_FAILED, { payment, error }),
  refunded: (payment) => eventBus.emit(EVENTS.PAYMENT_REFUNDED, payment),
}

module.exports = {
  EVENTS,
  eventBus,
  EventHandlers,
  setupDefaultHandlers,
  InvoiceEvents,
  SubscriptionEvents,
  ClientEvents,
  PaymentEvents,
}

/**
 * Subscription Model - Improved Version
 * Features:
 * - Works with both NeDB and MongoDB
 * - Better subscription tier management
 * - Automatic limit enforcement
 * - Stripe integration support
 */

const { createAdapter } = require('../lib/database')
const { validatePlan } = require('../lib/validation')

// Subscription plans configuration
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    invoiceLimit: 3,
    features: ['3 invoices per month', 'Basic client management', 'Email support'],
  },
  starter: {
    name: 'Starter',
    price: 1000, // $10.00 in cents
    invoiceLimit: 25,
    features: [
      '25 invoices per month',
      'Unlimited clients',
      'Priority email support',
      'Invoice templates',
    ],
  },
  pro: {
    name: 'Pro',
    price: 2000, // $20.00 in cents
    invoiceLimit: -1, // Unlimited
    features: [
      'Unlimited invoices',
      'Unlimited clients',
      'Priority support',
      'Custom branding',
      'PDF export',
      'Email sending',
    ],
  },
  business: {
    name: 'Business',
    price: 3000, // $30.00 in cents
    invoiceLimit: -1, // Unlimited
    features: [
      'Everything in Pro',
      'Team collaboration (up to 5 users)',
      'API access',
      'Advanced analytics',
      'Dedicated support',
    ],
  },
}

class SubscriptionModel {
  constructor() {
    this.db = createAdapter('subscriptions')
    this._initializeIndexes()
  }

  /**
   * Initialize database indexes
   * @private
   */
  async _initializeIndexes() {
    try {
      await this.db.createIndex({ userId: 1 }, { unique: true })
      await this.db.createIndex({ plan: 1 })
      await this.db.createIndex({ status: 1 })
    } catch (error) {
      console.warn('Failed to create indexes:', error.message)
    }
  }

  /**
   * Get plan configuration
   * @param {String} planName - Plan name
   * @returns {Object} Plan configuration
   */
  getPlanConfig(planName) {
    return PLANS[planName] || PLANS.free
  }

  /**
   * Get all available plans
   * @returns {Object} All plans configuration
   */
  getAllPlans() {
    return PLANS
  }

  /**
   * Find subscription by user ID (creates free plan if not exists)
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Subscription
   */
  async findByUserId(userId) {
    try {
      let subscription = await this.db.findOne({ userId })

      // Create default free subscription if doesn't exist
      if (!subscription) {
        subscription = await this.db.insertOne({
          userId,
          plan: 'free',
          status: 'active',
          invoiceLimit: PLANS.free.invoiceLimit,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        })
      }

      // Ensure plan config is attached
      subscription.planConfig = this.getPlanConfig(subscription.plan)

      return subscription
    } catch (error) {
      console.error('Error finding subscription:', error)
      throw error
    }
  }

  /**
   * Update subscription
   * @param {String} userId - User ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Update result
   */
  async update(userId, updates) {
    try {
      // Validate plan if being updated
      if (updates.plan) {
        const validatedPlan = validatePlan(updates.plan)
        updates.plan = validatedPlan
        updates.invoiceLimit = PLANS[validatedPlan].invoiceLimit
      }

      // Ensure subscription exists
      await this.findByUserId(userId)

      // Update subscription
      const result = await this.db.updateOne({ userId }, updates, { upsert: true })

      return result
    } catch (error) {
      console.error('Error updating subscription:', error)
      throw error
    }
  }

  /**
   * Check if user can create invoice
   * @param {String} userId - User ID
   * @param {Date} month - Month to check (defaults to current month)
   * @returns {Promise<Boolean>} True if user can create invoice
   */
  async canCreateInvoice(userId, month = new Date()) {
    try {
      const subscription = await this.findByUserId(userId)

      // Unlimited plans (-1)
      if (subscription.invoiceLimit === -1) {
        return true
      }

      // Inactive subscription
      if (subscription.status !== 'active') {
        return false
      }

      // Count invoices for current month
      const Invoice = require('./invoice')
      const count = await Invoice.countByUserId(userId, month)

      return count < subscription.invoiceLimit
    } catch (error) {
      console.error('Error checking invoice limit:', error)
      return false
    }
  }

  /**
   * Get invoice limit for user
   * @param {String} userId - User ID
   * @returns {Promise<Number>} Invoice limit (-1 for unlimited)
   */
  async getInvoiceLimit(userId) {
    try {
      const subscription = await this.findByUserId(userId)
      return subscription.invoiceLimit
    } catch (error) {
      console.error('Error getting invoice limit:', error)
      return 0
    }
  }

  /**
   * Get remaining invoices for current month
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Usage information
   */
  async getUsage(userId) {
    try {
      const subscription = await this.findByUserId(userId)
      const Invoice = require('./invoice')
      const count = await Invoice.countByUserId(userId, new Date())

      return {
        plan: subscription.plan,
        limit: subscription.invoiceLimit,
        used: count,
        remaining: subscription.invoiceLimit === -1 ? 'Unlimited' : Math.max(0, subscription.invoiceLimit - count),
        canCreate: await this.canCreateInvoice(userId),
      }
    } catch (error) {
      console.error('Error getting usage:', error)
      return {
        plan: 'free',
        limit: 0,
        used: 0,
        remaining: 0,
        canCreate: false,
      }
    }
  }

  /**
   * Upgrade subscription
   * @param {String} userId - User ID
   * @param {String} newPlan - New plan name
   * @param {String} stripeSubscriptionId - Stripe subscription ID
   * @returns {Promise<Object>} Updated subscription
   */
  async upgrade(userId, newPlan, stripeSubscriptionId = null) {
    try {
      const validatedPlan = validatePlan(newPlan)

      if (validatedPlan === 'free') {
        throw new Error('Cannot upgrade to free plan')
      }

      await this.update(userId, {
        plan: validatedPlan,
        status: 'active',
        stripeSubscriptionId,
        upgradedAt: new Date(),
      })

      return await this.findByUserId(userId)
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      throw error
    }
  }

  /**
   * Downgrade to free plan (when subscription cancelled)
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated subscription
   */
  async downgrade(userId) {
    try {
      await this.update(userId, {
        plan: 'free',
        status: 'active',
        stripeSubscriptionId: null,
        downgradedAt: new Date(),
      })

      return await this.findByUserId(userId)
    } catch (error) {
      console.error('Error downgrading subscription:', error)
      throw error
    }
  }

  /**
   * Cancel subscription
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated subscription
   */
  async cancel(userId) {
    try {
      await this.update(userId, {
        status: 'cancelled',
        cancelledAt: new Date(),
      })

      return await this.findByUserId(userId)
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      throw error
    }
  }

  /**
   * Reactivate subscription
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated subscription
   */
  async reactivate(userId) {
    try {
      await this.update(userId, {
        status: 'active',
        reactivatedAt: new Date(),
      })

      return await this.findByUserId(userId)
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      throw error
    }
  }

  /**
   * Get subscription statistics
   * @returns {Promise<Object>} Subscription statistics
   */
  async getStatistics() {
    try {
      const allSubscriptions = await this.db.find({})

      const stats = {
        total: allSubscriptions.length,
        active: 0,
        cancelled: 0,
        byPlan: {
          free: 0,
          starter: 0,
          pro: 0,
          business: 0,
        },
        mrr: 0, // Monthly Recurring Revenue
      }

      allSubscriptions.forEach((sub) => {
        if (sub.status === 'active') {
          stats.active++
        } else if (sub.status === 'cancelled') {
          stats.cancelled++
        }

        if (sub.plan && stats.byPlan[sub.plan] !== undefined) {
          stats.byPlan[sub.plan]++

          // Add to MRR if active and paid plan
          if (sub.status === 'active' && sub.plan !== 'free') {
            stats.mrr += PLANS[sub.plan].price
          }
        }
      })

      // Convert MRR from cents to dollars
      stats.mrr = stats.mrr / 100

      return stats
    } catch (error) {
      console.error('Error getting subscription statistics:', error)
      return {
        total: 0,
        active: 0,
        cancelled: 0,
        byPlan: { free: 0, starter: 0, pro: 0, business: 0 },
        mrr: 0,
      }
    }
  }
}

module.exports = new SubscriptionModel()

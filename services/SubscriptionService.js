/**
 * Subscription Service - Business Logic Layer
 * Manages subscription lifecycle with events, state machines, and caching
 */

const Subscription = require('../models-improved/subscription')
const { validatePlan } = require('../lib/validation')
const { SubscriptionEvents } = require('../lib/events')
const { createSubscriptionStateMachine } = require('../lib/state-machines')
const { cache, CacheKeys, CacheInvalidation } = require('../lib/cache')
const { NotFoundError, BusinessRuleError, PaymentError } = require('../lib/errors')

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

class SubscriptionService {
  /**
   * Get subscription for user
   */
  async getSubscription(userId) {
    const cacheKey = CacheKeys.subscription(userId)

    return await cache.getOrSet(
      cacheKey,
      async () => await Subscription.findByUserId(userId),
      300 // 5 minutes
    )
  }

  /**
   * Get subscription usage information
   */
  async getUsage(userId) {
    const subscription = await this.getSubscription(userId)
    return await Subscription.getUsage(userId)
  }

  /**
   * Check if user can create invoice
   */
  async canCreateInvoice(userId) {
    return await Subscription.canCreateInvoice(userId, new Date())
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(userId, newPlan, paymentMethodId = null) {
    // Validate plan
    const validatedPlan = validatePlan(newPlan)

    if (validatedPlan === 'free') {
      throw new BusinessRuleError('Cannot upgrade to free plan', 'INVALID_UPGRADE_PLAN')
    }

    // Get current subscription
    const currentSubscription = await this.getSubscription(userId)
    const oldPlan = currentSubscription.plan

    // Check if it's actually an upgrade
    const planHierarchy = ['free', 'starter', 'pro', 'business']
    const currentIndex = planHierarchy.indexOf(oldPlan)
    const newIndex = planHierarchy.indexOf(validatedPlan)

    if (newIndex <= currentIndex) {
      throw new BusinessRuleError(
        `Plan '${validatedPlan}' is not an upgrade from '${oldPlan}'`,
        'NOT_AN_UPGRADE'
      )
    }

    // Use state machine to validate transition
    const stateMachine = createSubscriptionStateMachine(currentSubscription.status)

    if (!stateMachine.canCharge()) {
      throw new BusinessRuleError(
        `Cannot upgrade subscription in '${currentSubscription.status}' status`,
        'INVALID_SUBSCRIPTION_STATUS'
      )
    }

    try {
      // Create Stripe checkout session or subscription
      let stripeSubscriptionId = null

      if (paymentMethodId) {
        // Direct subscription creation (if payment method provided)
        const planConfig = Subscription.getPlanConfig(validatedPlan)

        const stripeSubscription = await stripe.subscriptions.create({
          customer: currentSubscription.stripeCustomerId,
          items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${planConfig.name} Plan`,
                },
                unit_amount: planConfig.price,
                recurring: {
                  interval: 'month',
                },
              },
            },
          ],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            userId,
            plan: validatedPlan,
          },
        })

        stripeSubscriptionId = stripeSubscription.id
      }

      // Update subscription
      await Subscription.upgrade(userId, validatedPlan, stripeSubscriptionId)

      // Get updated subscription
      const updatedSubscription = await Subscription.findByUserId(userId)

      // Emit event
      SubscriptionEvents.upgraded(updatedSubscription, oldPlan, validatedPlan)

      // Invalidate caches
      CacheInvalidation.invalidateSubscriptions(userId)

      return updatedSubscription
    } catch (error) {
      if (error.type && error.type.startsWith('Stripe')) {
        throw new PaymentError(error.message, 'stripe', error)
      }
      throw error
    }
  }

  /**
   * Downgrade subscription
   */
  async downgradeSubscription(userId, reason = null) {
    // Get current subscription
    const currentSubscription = await this.getSubscription(userId)
    const oldPlan = currentSubscription.plan

    if (oldPlan === 'free') {
      throw new BusinessRuleError('Already on free plan', 'ALREADY_ON_FREE_PLAN')
    }

    // Cancel Stripe subscription if exists
    if (currentSubscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId)
      } catch (error) {
        console.error('Error cancelling Stripe subscription:', error)
        // Continue with downgrade even if Stripe fails
      }
    }

    // Downgrade to free
    await Subscription.downgrade(userId)

    // Get updated subscription
    const updatedSubscription = await Subscription.findByUserId(userId)

    // Emit event
    SubscriptionEvents.downgraded(updatedSubscription, oldPlan, 'free')

    // Invalidate caches
    CacheInvalidation.invalidateSubscriptions(userId)

    return updatedSubscription
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, reason = null) {
    // Get current subscription
    const currentSubscription = await this.getSubscription(userId)

    // Use state machine
    const stateMachine = createSubscriptionStateMachine(currentSubscription.status)

    if (!stateMachine.canTransitionTo('cancelled')) {
      throw new BusinessRuleError(
        `Cannot cancel subscription in '${currentSubscription.status}' status`,
        'INVALID_CANCELLATION_STATUS'
      )
    }

    // Cancel Stripe subscription
    if (currentSubscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId)
      } catch (error) {
        throw new PaymentError('Failed to cancel subscription', 'stripe', error)
      }
    }

    // Update subscription
    await Subscription.cancel(userId)

    // Get updated subscription
    const updatedSubscription = await Subscription.findByUserId(userId)

    // Emit event
    SubscriptionEvents.cancelled(updatedSubscription)

    // Invalidate caches
    CacheInvalidation.invalidateSubscriptions(userId)

    return updatedSubscription
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(userId) {
    const currentSubscription = await this.getSubscription(userId)

    if (currentSubscription.status !== 'cancelled') {
      throw new BusinessRuleError(
        'Can only reactivate cancelled subscriptions',
        'NOT_CANCELLED'
      )
    }

    // Reactivate
    await Subscription.reactivate(userId)

    // Get updated subscription
    const updatedSubscription = await Subscription.findByUserId(userId)

    // Emit event
    SubscriptionEvents.renewed(updatedSubscription)

    // Invalidate caches
    CacheInvalidation.invalidateSubscriptions(userId)

    return updatedSubscription
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this._handleCheckoutCompleted(event.data.object)
          break

        case 'customer.subscription.updated':
          await this._handleSubscriptionUpdated(event.data.object)
          break

        case 'customer.subscription.deleted':
          await this._handleSubscriptionDeleted(event.data.object)
          break

        case 'invoice.payment_failed':
          await this._handlePaymentFailed(event.data.object)
          break

        case 'invoice.payment_succeeded':
          await this._handlePaymentSucceeded(event.data.object)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error)
      throw error
    }
  }

  /**
   * Handle checkout completed
   * @private
   */
  async _handleCheckoutCompleted(session) {
    const userId = session.metadata.userId || session.client_reference_id
    const plan = session.metadata.plan

    if (userId && plan) {
      const currentSubscription = await this.getSubscription(userId)

      await Subscription.upgrade(userId, plan, session.subscription)

      // Invalidate cache
      CacheInvalidation.invalidateSubscriptions(userId)

      // Emit event
      const { PaymentEvents } = require('../lib/events')
      PaymentEvents.succeeded({
        userId,
        plan,
        amount: session.amount_total,
        sessionId: session.id,
      })
    }
  }

  /**
   * Handle subscription updated
   * @private
   */
  async _handleSubscriptionUpdated(subscription) {
    const userId = subscription.metadata?.userId

    if (userId) {
      // Refresh subscription data
      CacheInvalidation.invalidateSubscriptions(userId)
    }
  }

  /**
   * Handle subscription deleted
   * @private
   */
  async _handleSubscriptionDeleted(subscription) {
    const userId = subscription.metadata?.userId

    if (userId) {
      await this.downgradeSubscription(userId, 'stripe_subscription_deleted')
    }
  }

  /**
   * Handle payment failed
   * @private
   */
  async _handlePaymentFailed(invoice) {
    const userId = invoice.metadata?.userId

    if (userId) {
      const currentSubscription = await this.getSubscription(userId)
      const stateMachine = createSubscriptionStateMachine(currentSubscription.status)

      // Mark as past due
      if (stateMachine.canTransitionTo('past_due')) {
        await Subscription.update(userId, {
          status: 'past_due',
        })

        CacheInvalidation.invalidateSubscriptions(userId)

        // Emit event
        const { PaymentEvents } = require('../lib/events')
        PaymentEvents.failed({ userId, invoiceId: invoice.id }, invoice.last_payment_error)
      }
    }
  }

  /**
   * Handle payment succeeded
   * @private
   */
  async _handlePaymentSucceeded(invoice) {
    const userId = invoice.metadata?.userId

    if (userId) {
      const currentSubscription = await this.getSubscription(userId)

      // Reactivate if was past due
      if (currentSubscription.status === 'past_due') {
        const stateMachine = createSubscriptionStateMachine(currentSubscription.status)
        stateMachine.activate()

        await Subscription.update(userId, {
          status: 'active',
        })

        CacheInvalidation.invalidateSubscriptions(userId)
      }

      // Emit event
      const { PaymentEvents } = require('../lib/events')
      PaymentEvents.succeeded({
        userId,
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
      })
    }
  }

  /**
   * Get subscription statistics (admin)
   */
  async getStatistics() {
    const cacheKey = CacheKeys.subscriptionStats()

    return await cache.getOrSet(
      cacheKey,
      async () => await Subscription.getStatistics(),
      600 // 10 minutes
    )
  }

  /**
   * Get all plan configurations
   */
  getAllPlans() {
    return Subscription.getAllPlans()
  }

  /**
   * Get plan configuration
   */
  getPlanConfig(planName) {
    return Subscription.getPlanConfig(planName)
  }
}

module.exports = new SubscriptionService()

/**
 * State Machines - Enforce Valid State Transitions
 * Prevents invalid status changes and ensures business logic integrity
 */

const { InvalidStateTransitionError } = require('./errors')

/**
 * Base State Machine
 */
class StateMachine {
  constructor(initialState, transitions) {
    this.currentState = initialState
    this.transitions = transitions
    this.history = [{ state: initialState, timestamp: new Date() }]
  }

  /**
   * Check if transition is allowed
   */
  canTransitionTo(newState) {
    const allowedStates = this.transitions[this.currentState] || []
    return allowedStates.includes(newState)
  }

  /**
   * Get allowed transitions from current state
   */
  getAllowedTransitions() {
    return this.transitions[this.currentState] || []
  }

  /**
   * Transition to new state
   */
  transitionTo(newState, metadata = {}) {
    if (!this.canTransitionTo(newState)) {
      throw new InvalidStateTransitionError(
        this.currentState,
        newState,
        this.getAllowedTransitions()
      )
    }

    const oldState = this.currentState
    this.currentState = newState
    this.history.push({
      from: oldState,
      to: newState,
      timestamp: new Date(),
      metadata,
    })

    return this.currentState
  }

  /**
   * Get state history
   */
  getHistory() {
    return this.history
  }

  /**
   * Get current state
   */
  getState() {
    return this.currentState
  }

  /**
   * Reset to initial state
   */
  reset(initialState) {
    this.currentState = initialState
    this.history = [{ state: initialState, timestamp: new Date() }]
  }
}

/**
 * Invoice State Machine
 *
 * States: draft → unpaid → paid
 *                     ↓
 *                  overdue → paid
 *                     ↓
 *                  cancelled
 */
class InvoiceStateMachine extends StateMachine {
  static STATES = {
    DRAFT: 'draft',
    UNPAID: 'unpaid',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  }

  static TRANSITIONS = {
    [InvoiceStateMachine.STATES.DRAFT]: [
      InvoiceStateMachine.STATES.UNPAID,
      InvoiceStateMachine.STATES.CANCELLED,
    ],
    [InvoiceStateMachine.STATES.UNPAID]: [
      InvoiceStateMachine.STATES.PAID,
      InvoiceStateMachine.STATES.OVERDUE,
      InvoiceStateMachine.STATES.CANCELLED,
    ],
    [InvoiceStateMachine.STATES.OVERDUE]: [
      InvoiceStateMachine.STATES.PAID,
      InvoiceStateMachine.STATES.CANCELLED,
    ],
    [InvoiceStateMachine.STATES.PAID]: [
      InvoiceStateMachine.STATES.REFUNDED,
    ],
    [InvoiceStateMachine.STATES.CANCELLED]: [], // Terminal state
    [InvoiceStateMachine.STATES.REFUNDED]: [], // Terminal state
  }

  constructor(initialState = InvoiceStateMachine.STATES.UNPAID) {
    super(initialState, InvoiceStateMachine.TRANSITIONS)
  }

  /**
   * Mark as paid
   */
  markAsPaid(paymentDetails = {}) {
    return this.transitionTo(InvoiceStateMachine.STATES.PAID, {
      action: 'marked_as_paid',
      ...paymentDetails,
    })
  }

  /**
   * Mark as overdue
   */
  markAsOverdue() {
    return this.transitionTo(InvoiceStateMachine.STATES.OVERDUE, {
      action: 'marked_as_overdue',
    })
  }

  /**
   * Cancel invoice
   */
  cancel(reason = null) {
    return this.transitionTo(InvoiceStateMachine.STATES.CANCELLED, {
      action: 'cancelled',
      reason,
    })
  }

  /**
   * Issue refund
   */
  refund(refundDetails = {}) {
    return this.transitionTo(InvoiceStateMachine.STATES.REFUNDED, {
      action: 'refunded',
      ...refundDetails,
    })
  }

  /**
   * Send/finalize draft
   */
  send() {
    return this.transitionTo(InvoiceStateMachine.STATES.UNPAID, {
      action: 'sent_to_client',
    })
  }

  /**
   * Check if invoice is in terminal state
   */
  isTerminal() {
    return [
      InvoiceStateMachine.STATES.CANCELLED,
      InvoiceStateMachine.STATES.REFUNDED,
    ].includes(this.currentState)
  }

  /**
   * Check if invoice can be edited
   */
  canEdit() {
    return [
      InvoiceStateMachine.STATES.DRAFT,
      InvoiceStateMachine.STATES.UNPAID,
    ].includes(this.currentState)
  }

  /**
   * Check if invoice can be paid
   */
  canBePaid() {
    return [
      InvoiceStateMachine.STATES.UNPAID,
      InvoiceStateMachine.STATES.OVERDUE,
    ].includes(this.currentState)
  }
}

/**
 * Subscription State Machine
 *
 * States: trial → active → past_due → cancelled
 *                    ↓
 *                 paused → active
 */
class SubscriptionStateMachine extends StateMachine {
  static STATES = {
    TRIAL: 'trial',
    ACTIVE: 'active',
    PAUSED: 'paused',
    PAST_DUE: 'past_due',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
  }

  static TRANSITIONS = {
    [SubscriptionStateMachine.STATES.TRIAL]: [
      SubscriptionStateMachine.STATES.ACTIVE,
      SubscriptionStateMachine.STATES.CANCELLED,
      SubscriptionStateMachine.STATES.EXPIRED,
    ],
    [SubscriptionStateMachine.STATES.ACTIVE]: [
      SubscriptionStateMachine.STATES.PAUSED,
      SubscriptionStateMachine.STATES.PAST_DUE,
      SubscriptionStateMachine.STATES.CANCELLED,
    ],
    [SubscriptionStateMachine.STATES.PAUSED]: [
      SubscriptionStateMachine.STATES.ACTIVE,
      SubscriptionStateMachine.STATES.CANCELLED,
    ],
    [SubscriptionStateMachine.STATES.PAST_DUE]: [
      SubscriptionStateMachine.STATES.ACTIVE,
      SubscriptionStateMachine.STATES.CANCELLED,
    ],
    [SubscriptionStateMachine.STATES.CANCELLED]: [], // Terminal state
    [SubscriptionStateMachine.STATES.EXPIRED]: [], // Terminal state
  }

  constructor(initialState = SubscriptionStateMachine.STATES.ACTIVE) {
    super(initialState, SubscriptionStateMachine.TRANSITIONS)
  }

  /**
   * Activate subscription
   */
  activate(metadata = {}) {
    return this.transitionTo(SubscriptionStateMachine.STATES.ACTIVE, {
      action: 'activated',
      ...metadata,
    })
  }

  /**
   * Pause subscription
   */
  pause(reason = null) {
    return this.transitionTo(SubscriptionStateMachine.STATES.PAUSED, {
      action: 'paused',
      reason,
    })
  }

  /**
   * Resume paused subscription
   */
  resume() {
    return this.transitionTo(SubscriptionStateMachine.STATES.ACTIVE, {
      action: 'resumed',
    })
  }

  /**
   * Mark as past due (payment failed)
   */
  markAsPastDue(paymentError = null) {
    return this.transitionTo(SubscriptionStateMachine.STATES.PAST_DUE, {
      action: 'payment_failed',
      error: paymentError,
    })
  }

  /**
   * Cancel subscription
   */
  cancel(reason = null) {
    return this.transitionTo(SubscriptionStateMachine.STATES.CANCELLED, {
      action: 'cancelled',
      reason,
    })
  }

  /**
   * Mark trial as expired
   */
  expireTrial() {
    return this.transitionTo(SubscriptionStateMachine.STATES.EXPIRED, {
      action: 'trial_expired',
    })
  }

  /**
   * Check if subscription is active
   */
  isActive() {
    return this.currentState === SubscriptionStateMachine.STATES.ACTIVE
  }

  /**
   * Check if subscription can process charges
   */
  canCharge() {
    return [
      SubscriptionStateMachine.STATES.TRIAL,
      SubscriptionStateMachine.STATES.ACTIVE,
    ].includes(this.currentState)
  }

  /**
   * Check if subscription is in grace period
   */
  inGracePeriod() {
    return this.currentState === SubscriptionStateMachine.STATES.PAST_DUE
  }

  /**
   * Check if subscription is terminal
   */
  isTerminal() {
    return [
      SubscriptionStateMachine.STATES.CANCELLED,
      SubscriptionStateMachine.STATES.EXPIRED,
    ].includes(this.currentState)
  }
}

/**
 * Create invoice state machine from current state
 */
function createInvoiceStateMachine(currentState = 'unpaid') {
  return new InvoiceStateMachine(currentState)
}

/**
 * Create subscription state machine from current state
 */
function createSubscriptionStateMachine(currentState = 'active') {
  return new SubscriptionStateMachine(currentState)
}

/**
 * Validate invoice state transition
 */
function validateInvoiceTransition(fromState, toState) {
  const machine = new InvoiceStateMachine(fromState)
  return machine.canTransitionTo(toState)
}

/**
 * Validate subscription state transition
 */
function validateSubscriptionTransition(fromState, toState) {
  const machine = new SubscriptionStateMachine(fromState)
  return machine.canTransitionTo(toState)
}

module.exports = {
  StateMachine,
  InvoiceStateMachine,
  SubscriptionStateMachine,
  createInvoiceStateMachine,
  createSubscriptionStateMachine,
  validateInvoiceTransition,
  validateSubscriptionTransition,
}

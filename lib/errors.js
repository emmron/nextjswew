/**
 * Custom Error Classes - Domain-Specific Errors
 * Provides clear, actionable error types for different failure scenarios
 */

/**
 * Base Application Error
 */
class ApplicationError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

/**
 * Validation Error - Invalid input data
 */
class ValidationError extends ApplicationError {
  constructor(message, field = null, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.field = field
  }
}

/**
 * Authentication Error - User not authenticated
 */
class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

/**
 * Authorization Error - User lacks permission
 */
class AuthorizationError extends ApplicationError {
  constructor(message = 'You do not have permission to perform this action', resource = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', { resource })
  }
}

/**
 * Not Found Error - Resource doesn't exist
 */
class NotFoundError extends ApplicationError {
  constructor(resource, identifier = null) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    super(message, 404, 'NOT_FOUND', { resource, identifier })
    this.resource = resource
  }
}

/**
 * Conflict Error - Resource already exists or state conflict
 */
class ConflictError extends ApplicationError {
  constructor(message, conflictType = null) {
    super(message, 409, 'CONFLICT', { conflictType })
  }
}

/**
 * Business Logic Error - Business rule violation
 */
class BusinessRuleError extends ApplicationError {
  constructor(message, rule = null) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION', { rule })
  }
}

/**
 * Rate Limit Error - Too many requests
 */
class RateLimitError extends ApplicationError {
  constructor(retryAfter = 60) {
    super(
      `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      429,
      'RATE_LIMIT_EXCEEDED',
      { retryAfter }
    )
    this.retryAfter = retryAfter
  }
}

/**
 * Payment Error - Payment processing failed
 */
class PaymentError extends ApplicationError {
  constructor(message, paymentProvider = 'stripe', providerError = null) {
    super(message, 402, 'PAYMENT_ERROR', { paymentProvider, providerError })
  }
}

/**
 * Database Error - Database operation failed
 */
class DatabaseError extends ApplicationError {
  constructor(message, operation = null, originalError = null) {
    super(message, 500, 'DATABASE_ERROR', { operation, originalError: originalError?.message })
  }
}

/**
 * Subscription Limit Error - Invoice limit exceeded
 */
class SubscriptionLimitError extends BusinessRuleError {
  constructor(currentPlan, limit, used) {
    super(
      `Invoice limit reached for ${currentPlan} plan. You have used ${used} of ${limit} invoices this month.`,
      'SUBSCRIPTION_LIMIT'
    )
    this.currentPlan = currentPlan
    this.limit = limit
    this.used = used
  }
}

/**
 * Invalid State Transition Error - Cannot change to requested state
 */
class InvalidStateTransitionError extends BusinessRuleError {
  constructor(fromState, toState, allowedStates = []) {
    super(
      `Cannot transition from '${fromState}' to '${toState}'. Allowed transitions: ${allowedStates.join(', ')}`,
      'INVALID_STATE_TRANSITION'
    )
    this.fromState = fromState
    this.toState = toState
    this.allowedStates = allowedStates
  }
}

/**
 * External Service Error - Third-party service failed
 */
class ExternalServiceError extends ApplicationError {
  constructor(service, message, originalError = null) {
    super(
      `${service} error: ${message}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      { service, originalError: originalError?.message }
    )
  }
}

/**
 * Helper to check if error is operational (expected) vs programmer error
 */
function isOperationalError(error) {
  if (error instanceof ApplicationError) {
    return true
  }
  return false
}

/**
 * Error handler middleware for API routes
 */
function handleError(error, req, res) {
  // Log error
  console.error('[ERROR]', {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  })

  // Send appropriate response
  if (error instanceof ApplicationError) {
    return res.status(error.statusCode).json(error.toJSON())
  }

  // Unknown error - don't leak details in production
  return res.status(500).json({
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  })
}

module.exports = {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  RateLimitError,
  PaymentError,
  DatabaseError,
  SubscriptionLimitError,
  InvalidStateTransitionError,
  ExternalServiceError,
  isOperationalError,
  handleError,
}

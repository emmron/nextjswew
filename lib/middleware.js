/**
 * API Middleware - Authentication, Error Handling, Rate Limiting
 * Provides reusable middleware for Next.js API routes
 */

const { getSession } = require('next-auth/client')
const { ValidationError } = require('./validation')

/**
 * Error logger
 */
function logError(error, req) {
  const timestamp = new Date().toISOString()
  const method = req.method
  const url = req.url
  const userId = req.user?.id || 'anonymous'

  console.error(`[${timestamp}] ERROR ${method} ${url} - User: ${userId}`)
  console.error(`  Message: ${error.message}`)
  if (error.stack) {
    console.error(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`)
  }
}

/**
 * Authentication middleware
 * Ensures user is logged in and attaches user to request
 */
async function requireAuth(req, res, handler) {
  try {
    const session = await getSession({ req })

    if (!session || !session.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource',
      })
    }

    // Attach user to request for easy access
    req.user = session.user

    // Call the actual handler
    return await handler(req, res)
  } catch (error) {
    logError(error, req)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during authentication',
    })
  }
}

/**
 * Method guard middleware
 * Ensures only allowed HTTP methods are accepted
 */
function allowMethods(allowedMethods, handler) {
  return async (req, res) => {
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: `Method ${req.method} is not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      })
    }

    return await handler(req, res)
  }
}

/**
 * Error handling middleware
 * Catches and formats errors consistently
 */
function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res)
    } catch (error) {
      logError(error, req)

      // Validation errors
      if (error instanceof ValidationError || error.name === 'ValidationError') {
        return res.status(error.statusCode || 400).json({
          error: 'Validation Error',
          message: error.message,
          field: error.field,
          errors: error.errors,
        })
      }

      // Database errors
      if (error.message && error.message.includes('E11000')) {
        return res.status(409).json({
          error: 'Duplicate Entry',
          message: 'A record with this information already exists',
        })
      }

      // Stripe errors
      if (error.type && error.type.startsWith('Stripe')) {
        return res.status(402).json({
          error: 'Payment Error',
          message: error.message || 'An error occurred processing your payment',
        })
      }

      // Authorization errors
      if (error.message && error.message.toLowerCase().includes('unauthorized')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        })
      }

      // Generic server error
      return res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
      })
    }
  }
}

/**
 * Simple in-memory rate limiter
 * Prevents abuse by limiting requests per user per time window
 */
const rateLimitStore = new Map()

function rateLimit(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 60, // 60 requests per minute
    keyGenerator = (req) => req.user?.id || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
  } = options

  return async (req, res, handler) => {
    const key = keyGenerator(req)
    const now = Date.now()

    // Get or create rate limit entry
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 0, resetTime: now + windowMs })
    }

    const limit = rateLimitStore.get(key)

    // Reset if window expired
    if (now > limit.resetTime) {
      limit.count = 0
      limit.resetTime = now + windowMs
    }

    // Increment counter
    limit.count++

    // Check if limit exceeded
    if (limit.count > maxRequests) {
      const retryAfter = Math.ceil((limit.resetTime - now) / 1000)

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      })
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', maxRequests - limit.count)
    res.setHeader('X-RateLimit-Reset', new Date(limit.resetTime).toISOString())

    return await handler(req, res)
  }
}

/**
 * Request logger middleware
 */
function logRequest(handler) {
  return async (req, res) => {
    const start = Date.now()
    const method = req.method
    const url = req.url

    try {
      const result = await handler(req, res)
      const duration = Date.now() - start

      console.log(`[${new Date().toISOString()}] ${method} ${url} - ${res.statusCode} (${duration}ms)`)

      return result
    } catch (error) {
      const duration = Date.now() - start
      console.error(`[${new Date().toISOString()}] ${method} ${url} - ERROR (${duration}ms)`)
      throw error
    }
  }
}

/**
 * Compose multiple middleware functions
 */
function compose(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight((wrapped, middleware) => {
      return (req, res) => middleware(req, res, wrapped)
    }, handler)
  }
}

/**
 * Standard API route wrapper with common middleware
 * @param {Function} handler - Route handler function
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped handler with middleware
 */
function apiRoute(handler, options = {}) {
  const {
    auth = true, // Require authentication
    methods = null, // Allowed HTTP methods (null = all)
    rateLimit: rateLimitOptions = null, // Rate limiting options
    logging = process.env.NODE_ENV !== 'production', // Request logging
  } = options

  let wrappedHandler = handler

  // Apply error handling (always)
  wrappedHandler = withErrorHandling(wrappedHandler)

  // Apply method guard
  if (methods) {
    const originalHandler = wrappedHandler
    wrappedHandler = (req, res) => allowMethods(methods, originalHandler)(req, res)
  }

  // Apply rate limiting
  if (rateLimitOptions) {
    const originalHandler = wrappedHandler
    wrappedHandler = (req, res) => rateLimit(rateLimitOptions)(req, res, originalHandler)
  }

  // Apply authentication
  if (auth) {
    const originalHandler = wrappedHandler
    wrappedHandler = (req, res) => requireAuth(req, res, originalHandler)
  }

  // Apply request logging
  if (logging) {
    wrappedHandler = logRequest(wrappedHandler)
  }

  return wrappedHandler
}

/**
 * Parse request body safely
 */
async function parseBody(req) {
  // Body already parsed by Next.js
  if (req.body) {
    return req.body
  }

  // For custom parsing if needed
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('Invalid JSON in request body'))
      }
    })

    req.on('error', reject)
  })
}

/**
 * Success response helper
 */
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  })
}

/**
 * Error response helper
 */
function sendError(res, message, statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
  })
}

module.exports = {
  requireAuth,
  allowMethods,
  withErrorHandling,
  rateLimit,
  logRequest,
  compose,
  apiRoute,
  parseBody,
  sendSuccess,
  sendError,
  logError,
}

/**
 * Input Validation Utilities
 * Validates and sanitizes user input to prevent injection attacks and data corruption
 */

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.statusCode = 400
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

/**
 * Validate string field
 */
function validateString(value, fieldName, options = {}) {
  const { required = false, minLength = 0, maxLength = 1000, pattern = null } = options

  if (!value || value.trim() === '') {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName)
    }
    return value
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName)
  }

  const trimmed = value.trim()

  if (trimmed.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName
    )
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${maxLength} characters`,
      fieldName
    )
  }

  if (pattern && !pattern.test(trimmed)) {
    throw new ValidationError(`${fieldName} format is invalid`, fieldName)
  }

  return trimmed
}

/**
 * Validate number field
 */
function validateNumber(value, fieldName, options = {}) {
  const { required = false, min = null, max = null, integer = false } = options

  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName)
    }
    return value
  }

  const num = Number(value)

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName)
  }

  if (integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName)
  }

  if (min !== null && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName)
  }

  if (max !== null && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName)
  }

  return num
}

/**
 * Validate date field
 */
function validateDate(value, fieldName, options = {}) {
  const { required = false } = options

  if (!value) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName)
    }
    return value
  }

  const date = new Date(value)

  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`, fieldName)
  }

  return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
}

/**
 * Validate enum field
 */
function validateEnum(value, fieldName, allowedValues, required = false) {
  if (!value) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName)
    }
    return value
  }

  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    )
  }

  return value
}

/**
 * Validate array field
 */
function validateArray(value, fieldName, options = {}) {
  const { required = false, minLength = 0, maxLength = 100 } = options

  if (!value || value.length === 0) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName)
    }
    return value || []
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName)
  }

  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must have at least ${minLength} items`,
      fieldName
    )
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must have at most ${maxLength} items`,
      fieldName
    )
  }

  return value
}

/**
 * Validate invoice data
 */
function validateInvoice(data) {
  const errors = []

  try {
    // Validate client name
    if (!data.clientName || data.clientName.trim() === '') {
      errors.push({ field: 'clientName', message: 'Client name is required' })
    } else {
      data.clientName = validateString(data.clientName, 'Client name', {
        required: true,
        maxLength: 200,
      })
    }

    // Validate client email (optional)
    if (data.clientEmail) {
      data.clientEmail = validateString(data.clientEmail, 'Client email', {
        maxLength: 255,
      })
      if (!isValidEmail(data.clientEmail)) {
        errors.push({ field: 'clientEmail', message: 'Client email format is invalid' })
      }
    }

    // Validate client address (optional)
    if (data.clientAddress) {
      data.clientAddress = validateString(data.clientAddress, 'Client address', {
        maxLength: 500,
      })
    }

    // Validate date
    if (!data.date) {
      errors.push({ field: 'date', message: 'Invoice date is required' })
    } else {
      data.date = validateDate(data.date, 'Invoice date', { required: true })
    }

    // Validate due date (optional)
    if (data.dueDate) {
      data.dueDate = validateDate(data.dueDate, 'Due date')
    }

    // Validate items array
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push({ field: 'items', message: 'At least one line item is required' })
    } else {
      validateArray(data.items, 'Line items', { required: true, minLength: 1, maxLength: 50 })

      // Validate each line item
      data.items = data.items.map((item, index) => {
        const itemErrors = []

        if (!item.description || item.description.trim() === '') {
          itemErrors.push(`Item ${index + 1}: Description is required`)
        } else {
          item.description = validateString(item.description, 'Description', {
            required: true,
            maxLength: 500,
          })
        }

        try {
          item.quantity = validateNumber(item.quantity, 'Quantity', {
            required: true,
            min: 0,
            max: 1000000,
          })
        } catch (err) {
          itemErrors.push(`Item ${index + 1}: ${err.message}`)
        }

        try {
          item.rate = validateNumber(item.rate, 'Rate', {
            required: true,
            min: 0,
            max: 1000000,
          })
        } catch (err) {
          itemErrors.push(`Item ${index + 1}: ${err.message}`)
        }

        if (itemErrors.length > 0) {
          errors.push({ field: 'items', message: itemErrors.join(', ') })
        }

        return item
      })
    }

    // Validate status
    if (data.status) {
      data.status = validateEnum(data.status, 'Status', ['paid', 'unpaid', 'overdue'])
    } else {
      data.status = 'unpaid'
    }

    // Validate notes (optional)
    if (data.notes) {
      data.notes = validateString(data.notes, 'Notes', { maxLength: 2000 })
    }

    // Calculate totals
    if (data.items && Array.isArray(data.items)) {
      const subtotal = data.items.reduce((sum, item) => {
        return sum + (item.quantity || 0) * (item.rate || 0)
      }, 0)

      data.subtotal = Math.round(subtotal * 100) / 100
      data.tax = data.tax || 0
      data.total = Math.round((data.subtotal + data.tax) * 100) / 100
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed')
      error.statusCode = 400
      error.errors = errors
      throw error
    }

    return data
  } catch (err) {
    if (err.errors) throw err
    throw new ValidationError(err.message)
  }
}

/**
 * Validate client data
 */
function validateClient(data) {
  const errors = []

  try {
    // Validate client name
    if (!data.name || data.name.trim() === '') {
      errors.push({ field: 'name', message: 'Client name is required' })
    } else {
      data.name = validateString(data.name, 'Client name', {
        required: true,
        maxLength: 200,
      })
    }

    // Validate email (optional)
    if (data.email) {
      data.email = validateString(data.email, 'Email', { maxLength: 255 })
      if (!isValidEmail(data.email)) {
        errors.push({ field: 'email', message: 'Email format is invalid' })
      }
    }

    // Validate address (optional)
    if (data.address) {
      data.address = validateString(data.address, 'Address', { maxLength: 500 })
    }

    // Validate phone (optional)
    if (data.phone) {
      data.phone = validateString(data.phone, 'Phone', { maxLength: 50 })
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed')
      error.statusCode = 400
      error.errors = errors
      throw error
    }

    return data
  } catch (err) {
    if (err.errors) throw err
    throw new ValidationError(err.message)
  }
}

/**
 * Validate subscription plan
 */
function validatePlan(plan) {
  const allowedPlans = ['free', 'starter', 'pro', 'business']

  if (!plan) {
    throw new ValidationError('Plan is required', 'plan')
  }

  return validateEnum(plan, 'Plan', allowedPlans, true)
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHTML(str) {
  if (!str) return str

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

module.exports = {
  ValidationError,
  isValidEmail,
  validateString,
  validateNumber,
  validateDate,
  validateEnum,
  validateArray,
  validateInvoice,
  validateClient,
  validatePlan,
  sanitizeHTML,
}

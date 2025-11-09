/**
 * Cache Layer - In-Memory Caching with TTL
 * Improves performance by caching frequently accessed data
 */

/**
 * Simple in-memory cache with TTL support
 */
class Cache {
  constructor(defaultTTL = 300) {
    // Default TTL: 5 minutes
    this.store = new Map()
    this.defaultTTL = defaultTTL * 1000 // Convert to milliseconds
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    }
  }

  /**
   * Generate cache key
   */
  _generateKey(prefix, ...args) {
    return `${prefix}:${args.join(':')}`
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null) {
    const expiresAt = Date.now() + (ttl ? ttl * 1000 : this.defaultTTL)

    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    })

    this.stats.sets++
    return true
  }

  /**
   * Get value from cache
   */
  get(key) {
    const item = this.store.get(key)

    if (!item) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.store.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return item.value
  }

  /**
   * Delete value from cache
   */
  delete(key) {
    const deleted = this.store.delete(key)
    if (deleted) {
      this.stats.deletes++
    }
    return deleted
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const item = this.store.get(key)

    if (!item) {
      return false
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.store.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all cache
   */
  clear() {
    this.store.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    }
  }

  /**
   * Get or set pattern (lazy loading)
   */
  async getOrSet(key, fetchFunction, ttl = null) {
    const cached = this.get(key)

    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const value = await fetchFunction()

    // Cache it
    this.set(key, value, ttl)

    return value
  }

  /**
   * Delete by pattern (prefix matching)
   */
  deletePattern(pattern) {
    let deleted = 0

    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key)
        deleted++
      }
    }

    this.stats.deletes += deleted
    return deleted
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0

    return {
      ...this.stats,
      size: this.store.size,
      hitRate: hitRate.toFixed(2) + '%',
    }
  }

  /**
   * Clean expired entries
   */
  cleanup() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Get all keys
   */
  keys() {
    return Array.from(this.store.keys())
  }

  /**
   * Get cache size
   */
  size() {
    return this.store.size
  }
}

/**
 * Application-wide cache instance
 */
const cache = new Cache(300) // 5 minutes default TTL

/**
 * Auto-cleanup expired entries every 5 minutes
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = cache.cleanup()
    if (cleaned > 0) {
      console.log(`[CACHE] Cleaned ${cleaned} expired entries`)
    }
  }, 5 * 60 * 1000) // Every 5 minutes
}

/**
 * Cache key generators for different resources
 */
const CacheKeys = {
  invoice: (userId, invoiceId) => `invoice:${userId}:${invoiceId}`,
  invoices: (userId) => `invoices:${userId}`,
  invoiceStats: (userId) => `invoice-stats:${userId}`,

  subscription: (userId) => `subscription:${userId}`,
  subscriptionStats: () => 'subscription-stats:all',

  client: (userId, clientId) => `client:${userId}:${clientId}`,
  clients: (userId) => `clients:${userId}`,
  clientStats: (userId) => `client-stats:${userId}`,

  user: (userId) => `user:${userId}`,
  userSession: (sessionId) => `session:${sessionId}`,
}

/**
 * Cache invalidation helpers
 */
const CacheInvalidation = {
  /**
   * Invalidate all invoice caches for a user
   */
  invalidateInvoices(userId) {
    cache.deletePattern(`invoice:${userId}`)
    cache.deletePattern(`invoices:${userId}`)
    cache.delete(CacheKeys.invoiceStats(userId))
  },

  /**
   * Invalidate all subscription caches
   */
  invalidateSubscriptions(userId) {
    cache.delete(CacheKeys.subscription(userId))
    cache.delete(CacheKeys.subscriptionStats())
  },

  /**
   * Invalidate all client caches for a user
   */
  invalidateClients(userId) {
    cache.deletePattern(`client:${userId}`)
    cache.deletePattern(`clients:${userId}`)
    cache.delete(CacheKeys.clientStats(userId))
  },

  /**
   * Invalidate everything for a user
   */
  invalidateUser(userId) {
    this.invalidateInvoices(userId)
    this.invalidateSubscriptions(userId)
    this.invalidateClients(userId)
    cache.delete(CacheKeys.user(userId))
  },

  /**
   * Invalidate all caches
   */
  invalidateAll() {
    cache.clear()
  },
}

/**
 * Decorator for caching function results
 */
function cached(ttl = 300) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`

      return await cache.getOrSet(
        cacheKey,
        async () => await originalMethod.apply(this, args),
        ttl
      )
    }

    return descriptor
  }
}

module.exports = {
  Cache,
  cache,
  CacheKeys,
  CacheInvalidation,
  cached,
}

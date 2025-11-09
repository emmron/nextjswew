const NeDB = require('nedb')

class Subscription {
  constructor() {
    const dbPath = process.env.NEDB_PATH || './db'
    this.db = new NeDB({
      filename: `${dbPath}/subscriptions.db`,
      autoload: true
    })
    this.db.ensureIndex({ fieldName: 'userId', unique: true })
  }

  create(subscription) {
    return new Promise((resolve, reject) => {
      this.db.insert({
        ...subscription,
        createdAt: new Date()
      }, (err, doc) => {
        if (err) return reject(err)
        resolve(doc)
      })
    })
  }

  findByUserId(userId) {
    return new Promise((resolve, reject) => {
      this.db.findOne({ userId }, (err, doc) => {
        if (err) return reject(err)
        if (!doc) {
          // Create free plan by default
          this.create({
            userId,
            plan: 'free',
            status: 'active',
            invoiceLimit: 3
          }).then(resolve).catch(reject)
        } else {
          resolve(doc)
        }
      })
    })
  }

  update(userId, updates) {
    return new Promise((resolve, reject) => {
      this.db.update(
        { userId },
        { $set: updates },
        { upsert: true },
        (err, numReplaced) => {
          if (err) return reject(err)
          resolve(numReplaced)
        }
      )
    })
  }

  canCreateInvoice(userId, currentMonth) {
    return new Promise(async (resolve, reject) => {
      try {
        const sub = await this.findByUserId(userId)

        if (sub.plan === 'pro' || sub.plan === 'business') {
          return resolve(true) // Unlimited
        }

        const Invoice = require('./invoice')
        const count = await Invoice.countByUserId(userId, currentMonth)

        resolve(count < sub.invoiceLimit)
      } catch (error) {
        reject(error)
      }
    })
  }

  getInvoiceLimit(userId) {
    return new Promise(async (resolve, reject) => {
      try {
        const sub = await this.findByUserId(userId)
        resolve(sub.invoiceLimit || 0)
      } catch (error) {
        reject(error)
      }
    })
  }
}

module.exports = new Subscription()

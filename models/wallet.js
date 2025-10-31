const NeDB = require('nedb')

class Wallet {
  constructor() {
    const dbPath = process.env.NEDB_PATH || './db'
    this.db = new NeDB({
      filename: `${dbPath}/wallets.db`,
      autoload: true
    })
    this.db.ensureIndex({ fieldName: 'userId', unique: true })
  }

  create(userId) {
    return new Promise((resolve, reject) => {
      this.db.insert({
        userId,
        balance: 0,
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
        // Create wallet if it doesn't exist
        if (!doc) {
          this.create(userId).then(resolve).catch(reject)
        } else {
          resolve(doc)
        }
      })
    })
  }

  addFunds(userId, amount) {
    return new Promise((resolve, reject) => {
      this.db.update(
        { userId },
        { $inc: { balance: amount } },
        { upsert: true },
        (err, numReplaced) => {
          if (err) return reject(err)
          resolve(numReplaced)
        }
      )
    })
  }

  deductFunds(userId, amount) {
    return new Promise((resolve, reject) => {
      // First check if user has enough balance
      this.findByUserId(userId).then(wallet => {
        if (wallet.balance < amount) {
          return reject(new Error('Insufficient balance'))
        }
        this.db.update(
          { userId },
          { $inc: { balance: -amount } },
          {},
          (err, numReplaced) => {
            if (err) return reject(err)
            resolve(numReplaced)
          }
        )
      }).catch(reject)
    })
  }

  getBalance(userId) {
    return new Promise((resolve, reject) => {
      this.findByUserId(userId).then(wallet => {
        resolve(wallet ? wallet.balance : 0)
      }).catch(reject)
    })
  }
}

module.exports = new Wallet()

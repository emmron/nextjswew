const NeDB = require('nedb')

class Bet {
  constructor() {
    const dbPath = process.env.NEDB_PATH || './db'
    this.db = new NeDB({
      filename: `${dbPath}/bets.db`,
      autoload: true
    })
    this.db.ensureIndex({ fieldName: 'userId' })
    this.db.ensureIndex({ fieldName: 'eventId' })
    this.db.ensureIndex({ fieldName: 'status' })
  }

  create(bet) {
    return new Promise((resolve, reject) => {
      this.db.insert(bet, (err, doc) => {
        if (err) return reject(err)
        resolve(doc)
      })
    })
  }

  findById(id) {
    return new Promise((resolve, reject) => {
      this.db.findOne({ _id: id }, (err, doc) => {
        if (err) return reject(err)
        resolve(doc)
      })
    })
  }

  findByUserId(userId) {
    return new Promise((resolve, reject) => {
      this.db.find({ userId }).sort({ createdAt: -1 }).exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs)
      })
    })
  }

  findByEventId(eventId) {
    return new Promise((resolve, reject) => {
      this.db.find({ eventId }).exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs)
      })
    })
  }

  findActive(userId) {
    return new Promise((resolve, reject) => {
      this.db.find({ userId, status: 'active' }).sort({ createdAt: -1 }).exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs)
      })
    })
  }

  update(id, updates) {
    return new Promise((resolve, reject) => {
      this.db.update({ _id: id }, { $set: updates }, {}, (err, numReplaced) => {
        if (err) return reject(err)
        resolve(numReplaced)
      })
    })
  }

  settle(id, result) {
    return new Promise((resolve, reject) => {
      this.db.update(
        { _id: id },
        { $set: { status: result, settledAt: new Date() } },
        {},
        (err, numReplaced) => {
          if (err) return reject(err)
          resolve(numReplaced)
        }
      )
    })
  }
}

module.exports = new Bet()

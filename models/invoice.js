const NeDB = require('nedb')

class Invoice {
  constructor() {
    const dbPath = process.env.NEDB_PATH || './db'
    this.db = new NeDB({
      filename: `${dbPath}/invoices.db`,
      autoload: true
    })
    this.db.ensureIndex({ fieldName: 'userId' })
    this.db.ensureIndex({ fieldName: 'invoiceNumber' })
  }

  create(invoice) {
    return new Promise((resolve, reject) => {
      this.db.insert({
        ...invoice,
        createdAt: new Date(),
        updatedAt: new Date()
      }, (err, doc) => {
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

  countByUserId(userId, month = null) {
    return new Promise((resolve, reject) => {
      let query = { userId }

      if (month) {
        const startOfMonth = new Date(month)
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const endOfMonth = new Date(month)
        endOfMonth.setMonth(endOfMonth.getMonth() + 1)
        endOfMonth.setDate(0)
        endOfMonth.setHours(23, 59, 59, 999)

        query.createdAt = { $gte: startOfMonth, $lte: endOfMonth }
      }

      this.db.count(query, (err, count) => {
        if (err) return reject(err)
        resolve(count)
      })
    })
  }

  update(id, updates) {
    return new Promise((resolve, reject) => {
      this.db.update(
        { _id: id },
        { $set: { ...updates, updatedAt: new Date() } },
        {},
        (err, numReplaced) => {
          if (err) return reject(err)
          resolve(numReplaced)
        }
      )
    })
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.remove({ _id: id }, {}, (err, numRemoved) => {
        if (err) return reject(err)
        resolve(numRemoved)
      })
    })
  }

  getNextInvoiceNumber(userId) {
    return new Promise((resolve, reject) => {
      this.db.find({ userId }).sort({ invoiceNumber: -1 }).limit(1).exec((err, docs) => {
        if (err) return reject(err)
        const lastNumber = docs.length > 0 ? parseInt(docs[0].invoiceNumber) || 1000 : 1000
        resolve((lastNumber + 1).toString())
      })
    })
  }
}

module.exports = new Invoice()

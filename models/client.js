const NeDB = require('nedb')

class Client {
  constructor() {
    const dbPath = process.env.NEDB_PATH || './db'
    this.db = new NeDB({
      filename: `${dbPath}/clients.db`,
      autoload: true
    })
    this.db.ensureIndex({ fieldName: 'userId' })
  }

  create(client) {
    return new Promise((resolve, reject) => {
      this.db.insert({
        ...client,
        createdAt: new Date()
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
      this.db.find({ userId }).sort({ name: 1 }).exec((err, docs) => {
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

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.remove({ _id: id }, {}, (err, numRemoved) => {
        if (err) return reject(err)
        resolve(numRemoved)
      })
    })
  }
}

module.exports = new Client()

const NeDB = require('nedb')

class Event {
  constructor() {
    const dbPath = process.env.NEDB_PATH || './db'
    this.db = new NeDB({
      filename: `${dbPath}/events.db`,
      autoload: true
    })
    this.db.ensureIndex({ fieldName: 'status' })
    this.db.ensureIndex({ fieldName: 'startTime' })
  }

  create(event) {
    return new Promise((resolve, reject) => {
      this.db.insert({
        ...event,
        createdAt: new Date(),
        status: 'upcoming'
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

  findUpcoming() {
    return new Promise((resolve, reject) => {
      this.db.find({ status: 'upcoming' }).sort({ startTime: 1 }).exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs)
      })
    })
  }

  findLive() {
    return new Promise((resolve, reject) => {
      this.db.find({ status: 'live' }).sort({ startTime: 1 }).exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs)
      })
    })
  }

  findAll() {
    return new Promise((resolve, reject) => {
      this.db.find({}).sort({ startTime: 1 }).exec((err, docs) => {
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

module.exports = new Event()

/**
 * Database Adapter - Unified interface for NeDB and MongoDB
 * Automatically switches based on environment configuration
 * Supports both serverless (Vercel) and traditional (Railway/Heroku) deployments
 */

const USE_MONGODB = process.env.USE_MONGODB === 'true' && process.env.MONGODB_URI

let MongoClient, ObjectId
if (USE_MONGODB) {
  try {
    const mongodb = require('mongodb')
    MongoClient = mongodb.MongoClient
    ObjectId = mongodb.ObjectId
  } catch (err) {
    console.warn('MongoDB driver not installed. Install with: npm install mongodb')
  }
}

const Datastore = require('nedb')
const path = require('path')

/**
 * MongoDB Connection Pool
 */
let cachedClient = null
let cachedDb = null

async function connectToMongoDB() {
  if (cachedDb && cachedClient) {
    return { client: cachedClient, db: cachedDb }
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
    })

    const db = client.db('invoiceflow')

    cachedClient = client
    cachedDb = db

    console.log('✓ Connected to MongoDB Atlas')
    return { client, db }
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message)
    throw new Error(`Failed to connect to MongoDB: ${error.message}`)
  }
}

/**
 * NeDB Connection Pool
 */
const nedbStores = {}

function getNeDBStore(collectionName) {
  if (!nedbStores[collectionName]) {
    const dbPath = process.env.NEDB_PATH || './db'
    nedbStores[collectionName] = new Datastore({
      filename: path.join(dbPath, `${collectionName}.db`),
      autoload: true,
      timestampData: true,
    })

    // Create indexes for better performance
    nedbStores[collectionName].ensureIndex({ fieldName: 'userId' })
    nedbStores[collectionName].ensureIndex({ fieldName: 'createdAt' })

    console.log(`✓ Loaded NeDB store: ${collectionName}`)
  }
  return nedbStores[collectionName]
}

/**
 * Database Adapter Class
 */
class DatabaseAdapter {
  constructor(collectionName) {
    this.collectionName = collectionName
    this.useMongo = USE_MONGODB
  }

  /**
   * Get collection (MongoDB) or store (NeDB)
   */
  async getCollection() {
    if (this.useMongo) {
      const { db } = await connectToMongoDB()
      return db.collection(this.collectionName)
    } else {
      return getNeDBStore(this.collectionName)
    }
  }

  /**
   * Insert one document
   * @param {Object} doc - Document to insert
   * @returns {Promise<Object>} Inserted document with _id
   */
  async insertOne(doc) {
    const collection = await this.getCollection()
    const timestamp = new Date()

    if (this.useMongo) {
      const result = await collection.insertOne({
        ...doc,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      return { ...doc, _id: result.insertedId, createdAt: timestamp, updatedAt: timestamp }
    } else {
      return new Promise((resolve, reject) => {
        collection.insert(
          { ...doc, createdAt: timestamp, updatedAt: timestamp },
          (err, newDoc) => {
            if (err) reject(new Error(`NeDB insert error: ${err.message}`))
            else resolve(newDoc)
          }
        )
      })
    }
  }

  /**
   * Find documents
   * @param {Object} query - Query object
   * @param {Object} options - Options (sort, limit, skip)
   * @returns {Promise<Array>} Array of documents
   */
  async find(query = {}, options = {}) {
    const collection = await this.getCollection()

    if (this.useMongo) {
      const cursor = collection.find(query)

      if (options.sort) cursor.sort(options.sort)
      if (options.limit) cursor.limit(options.limit)
      if (options.skip) cursor.skip(options.skip)

      return await cursor.toArray()
    } else {
      return new Promise((resolve, reject) => {
        let cursor = collection.find(query)

        if (options.sort) cursor = cursor.sort(options.sort)
        if (options.limit) cursor = cursor.limit(options.limit)
        if (options.skip) cursor = cursor.skip(options.skip)

        cursor.exec((err, docs) => {
          if (err) reject(new Error(`NeDB find error: ${err.message}`))
          else resolve(docs || [])
        })
      })
    }
  }

  /**
   * Find one document
   * @param {Object} query - Query object
   * @returns {Promise<Object|null>} Document or null
   */
  async findOne(query) {
    const collection = await this.getCollection()

    if (this.useMongo) {
      return await collection.findOne(query)
    } else {
      return new Promise((resolve, reject) => {
        collection.findOne(query, (err, doc) => {
          if (err) reject(new Error(`NeDB findOne error: ${err.message}`))
          else resolve(doc)
        })
      })
    }
  }

  /**
   * Find by ID
   * @param {String} id - Document ID
   * @returns {Promise<Object|null>} Document or null
   */
  async findById(id) {
    if (this.useMongo) {
      try {
        return await this.findOne({ _id: new ObjectId(id) })
      } catch (err) {
        return null // Invalid ObjectId format
      }
    } else {
      return await this.findOne({ _id: id })
    }
  }

  /**
   * Update one document
   * @param {Object} query - Query object
   * @param {Object} update - Update object
   * @param {Object} options - Options (upsert)
   * @returns {Promise<Object>} Update result
   */
  async updateOne(query, update, options = {}) {
    const collection = await this.getCollection()
    const timestamp = new Date()

    if (this.useMongo) {
      return await collection.updateOne(
        query,
        { $set: { ...update, updatedAt: timestamp } },
        options
      )
    } else {
      return new Promise((resolve, reject) => {
        collection.update(
          query,
          { $set: { ...update, updatedAt: timestamp } },
          options,
          (err, numAffected) => {
            if (err) reject(new Error(`NeDB update error: ${err.message}`))
            else resolve({ modifiedCount: numAffected })
          }
        )
      })
    }
  }

  /**
   * Update by ID
   * @param {String} id - Document ID
   * @param {Object} update - Update object
   * @returns {Promise<Object>} Update result
   */
  async updateById(id, update) {
    if (this.useMongo) {
      try {
        return await this.updateOne({ _id: new ObjectId(id) }, update)
      } catch (err) {
        throw new Error('Invalid ID format')
      }
    } else {
      return await this.updateOne({ _id: id }, update)
    }
  }

  /**
   * Delete one document
   * @param {Object} query - Query object
   * @returns {Promise<Object>} Delete result
   */
  async deleteOne(query) {
    const collection = await this.getCollection()

    if (this.useMongo) {
      return await collection.deleteOne(query)
    } else {
      return new Promise((resolve, reject) => {
        collection.remove(query, { multi: false }, (err, numRemoved) => {
          if (err) reject(new Error(`NeDB delete error: ${err.message}`))
          else resolve({ deletedCount: numRemoved })
        })
      })
    }
  }

  /**
   * Delete by ID
   * @param {String} id - Document ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteById(id) {
    if (this.useMongo) {
      try {
        return await this.deleteOne({ _id: new ObjectId(id) })
      } catch (err) {
        throw new Error('Invalid ID format')
      }
    } else {
      return await this.deleteOne({ _id: id })
    }
  }

  /**
   * Count documents
   * @param {Object} query - Query object
   * @returns {Promise<Number>} Count
   */
  async count(query = {}) {
    const collection = await this.getCollection()

    if (this.useMongo) {
      return await collection.countDocuments(query)
    } else {
      return new Promise((resolve, reject) => {
        collection.count(query, (err, count) => {
          if (err) reject(new Error(`NeDB count error: ${err.message}`))
          else resolve(count)
        })
      })
    }
  }

  /**
   * Create index
   * @param {Object} fieldOrSpec - Field name or index specification
   * @param {Object} options - Index options
   */
  async createIndex(fieldOrSpec, options = {}) {
    const collection = await this.getCollection()

    if (this.useMongo) {
      await collection.createIndex(fieldOrSpec, options)
    } else {
      // NeDB uses ensureIndex
      const fieldName = typeof fieldOrSpec === 'string' ? fieldOrSpec : Object.keys(fieldOrSpec)[0]
      collection.ensureIndex({ fieldName, ...options })
    }
  }
}

/**
 * Factory function to create database adapter
 * @param {String} collectionName - Name of collection/store
 * @returns {DatabaseAdapter} Database adapter instance
 */
function createAdapter(collectionName) {
  return new DatabaseAdapter(collectionName)
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    if (USE_MONGODB) {
      await connectToMongoDB()
      console.log('✓ Database: MongoDB Atlas')
    } else {
      getNeDBStore('test')
      console.log('✓ Database: NeDB (file-based)')
    }
    return true
  } catch (error) {
    console.error('✗ Database connection failed:', error.message)
    return false
  }
}

module.exports = {
  createAdapter,
  testConnection,
  DatabaseAdapter,
  USE_MONGODB,
}

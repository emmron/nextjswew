const NeDB = require('nedb')

class HouseBankroll {
  constructor() {
    const dbPath = process.env.NEDB_PATH || './db'
    this.db = new NeDB({
      filename: `${dbPath}/house.db`,
      autoload: true
    })
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.findOne({ type: 'bankroll' }, (err, doc) => {
        if (err) return reject(err)
        if (!doc) {
          // Initialize house bankroll with starting balance
          this.db.insert({
            type: 'bankroll',
            balance: 0, // Start at $0, grows from membership fees
            totalMembershipRevenue: 0,
            totalBetsReceived: 0,
            totalPayouts: 0,
            profit: 0,
            createdAt: new Date()
          }, (err, doc) => {
            if (err) return reject(err)
            resolve(doc)
          })
        } else {
          resolve(doc)
        }
      })
    })
  }

  async getBalance() {
    await this.initialize()
    return new Promise((resolve, reject) => {
      this.db.findOne({ type: 'bankroll' }, (err, doc) => {
        if (err) return reject(err)
        resolve(doc)
      })
    })
  }

  async addMembershipFee(amount) {
    await this.initialize()
    return new Promise((resolve, reject) => {
      this.db.update(
        { type: 'bankroll' },
        {
          $inc: {
            balance: amount,
            totalMembershipRevenue: amount,
            profit: amount
          }
        },
        {},
        (err, numReplaced) => {
          if (err) return reject(err)
          resolve(numReplaced)
        }
      )
    })
  }

  async receiveBet(amount) {
    // When user places bet, house receives the funds
    await this.initialize()
    return new Promise((resolve, reject) => {
      this.db.update(
        { type: 'bankroll' },
        {
          $inc: {
            balance: amount,
            totalBetsReceived: amount
          }
        },
        {},
        (err, numReplaced) => {
          if (err) return reject(err)
          resolve(numReplaced)
        }
      )
    })
  }

  async payout(amount) {
    // When winner gets paid
    await this.initialize()
    return new Promise((resolve, reject) => {
      this.db.findOne({ type: 'bankroll' }, (err, doc) => {
        if (err) return reject(err)

        if (doc.balance < amount) {
          return reject(new Error('Insufficient house funds'))
        }

        this.db.update(
          { type: 'bankroll' },
          {
            $inc: {
              balance: -amount,
              totalPayouts: amount,
              profit: -amount
            }
          },
          {},
          (err, numReplaced) => {
            if (err) return reject(err)
            resolve(numReplaced)
          }
        )
      })
    })
  }

  async calculateMaxBet(odds) {
    // Calculate maximum bet allowed based on house bankroll
    // Rule: Never risk more than 10% of bankroll on a single bet
    const house = await this.getBalance()
    const maxRisk = house.balance * 0.10 // 10% max risk per bet
    const potentialPayout = maxRisk / (odds - 1) // How much can be wagered

    return Math.max(5, Math.floor(potentialPayout)) // Minimum $5 bet
  }

  async getStats() {
    const house = await this.getBalance()
    return {
      balance: house.balance,
      totalMembershipRevenue: house.totalMembershipRevenue,
      totalBetsReceived: house.totalBetsReceived,
      totalPayouts: house.totalPayouts,
      profit: house.profit,
      roi: house.totalBetsReceived > 0
        ? ((house.profit / house.totalBetsReceived) * 100).toFixed(2)
        : 0
    }
  }
}

module.exports = new HouseBankroll()

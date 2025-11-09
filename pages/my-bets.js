import React from 'react'
import { Container, Table, Badge, Alert, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      bets: [],
      activeBets: [],
      activeTab: '1',
      loading: true,
      error: null
    }
  }

  async componentDidMount() {
    await this.loadData()
  }

  async loadData() {
    try {
      if (!this.props.session.user) {
        return
      }

      // Load all bets
      const betsRes = await fetch('/api/bets/my-bets')
      const betsData = await betsRes.json()

      // Load active bets
      const activeRes = await fetch('/api/bets/active')
      const activeData = await activeRes.json()

      this.setState({
        bets: betsData.bets || [],
        activeBets: activeData.bets || [],
        loading: false
      })
    } catch (error) {
      console.error('Error loading data:', error)
      this.setState({ error: error.message, loading: false })
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  getStatusBadge(status) {
    const colors = {
      active: 'primary',
      won: 'success',
      lost: 'danger'
    }
    return <Badge color={colors[status] || 'secondary'}>{status.toUpperCase()}</Badge>
  }

  toggle(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab })
    }
  }

  renderBetsTable(bets) {
    if (bets.length === 0) {
      return <Alert color="info">No bets found.</Alert>
    }

    return (
      <Table responsive striped>
        <thead>
          <tr>
            <th>Event</th>
            <th>Selection</th>
            <th>Amount</th>
            <th>Odds</th>
            <th>Potential Win</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {bets.map(bet => (
            <tr key={bet._id}>
              <td>{bet.eventName}</td>
              <td><strong>{bet.selection}</strong></td>
              <td>${bet.amount.toFixed(2)}</td>
              <td>{bet.odds.toFixed(2)}</td>
              <td className="text-success">${bet.potentialWin.toFixed(2)}</td>
              <td>{this.getStatusBadge(bet.status)}</td>
              <td>{this.formatDate(bet.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    )
  }

  render() {
    const { session } = this.props
    const { bets, activeBets, activeTab, loading, error } = this.state

    if (loading) {
      return (
        <Layout {...this.props} navmenu={true}>
          <Container>
            <h1 className="display-4 mt-4">Loading...</h1>
          </Container>
        </Layout>
      )
    }

    if (!session.user) {
      return (
        <Layout {...this.props} navmenu={true}>
          <Container>
            <Alert color="warning" className="mt-4">
              Please <a href="/auth">sign in</a> to view your bets.
            </Alert>
          </Container>
        </Layout>
      )
    }

    const wonBets = bets.filter(b => b.status === 'won')
    const lostBets = bets.filter(b => b.status === 'lost')
    const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0)
    const totalWon = wonBets.reduce((sum, b) => sum + b.potentialWin, 0)
    const totalLost = lostBets.reduce((sum, b) => sum + b.amount, 0)

    return (
      <Layout {...this.props} navmenu={true}>
        <Container className="mt-4 mb-5">
          <h1 className="display-4 mb-4">My Bets</h1>

          {error && <Alert color="danger">{error}</Alert>}

          <div className="mb-4 p-3 bg-light rounded">
            <h5>Statistics</h5>
            <div className="row">
              <div className="col-md-3">
                <strong>Total Bets:</strong> {bets.length}
              </div>
              <div className="col-md-3">
                <strong>Active:</strong> {activeBets.length}
              </div>
              <div className="col-md-3">
                <strong>Won:</strong> <span className="text-success">{wonBets.length}</span>
              </div>
              <div className="col-md-3">
                <strong>Lost:</strong> <span className="text-danger">{lostBets.length}</span>
              </div>
            </div>
            <hr />
            <div className="row">
              <div className="col-md-4">
                <strong>Total Wagered:</strong> ${totalWagered.toFixed(2)}
              </div>
              <div className="col-md-4">
                <strong>Total Won:</strong> <span className="text-success">${totalWon.toFixed(2)}</span>
              </div>
              <div className="col-md-4">
                <strong>Net:</strong> <span className={totalWon - totalLost >= 0 ? 'text-success' : 'text-danger'}>
                  ${(totalWon - totalLost).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Nav tabs>
            <NavItem>
              <NavLink
                className={activeTab === '1' ? 'active' : ''}
                onClick={() => this.toggle('1')}
                style={{ cursor: 'pointer' }}
              >
                All Bets ({bets.length})
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === '2' ? 'active' : ''}
                onClick={() => this.toggle('2')}
                style={{ cursor: 'pointer' }}
              >
                Active ({activeBets.length})
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === '3' ? 'active' : ''}
                onClick={() => this.toggle('3')}
                style={{ cursor: 'pointer' }}
              >
                Won ({wonBets.length})
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === '4' ? 'active' : ''}
                onClick={() => this.toggle('4')}
                style={{ cursor: 'pointer' }}
              >
                Lost ({lostBets.length})
              </NavLink>
            </NavItem>
          </Nav>

          <TabContent activeTab={activeTab} className="mt-3">
            <TabPane tabId="1">
              {this.renderBetsTable(bets)}
            </TabPane>
            <TabPane tabId="2">
              {this.renderBetsTable(activeBets)}
            </TabPane>
            <TabPane tabId="3">
              {this.renderBetsTable(wonBets)}
            </TabPane>
            <TabPane tabId="4">
              {this.renderBetsTable(lostBets)}
            </TabPane>
          </TabContent>
        </Container>
      </Layout>
    )
  }
}

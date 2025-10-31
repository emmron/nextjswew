import React from 'react'
import { Container, Row, Col, Card, CardBody, Alert, Badge, Progress } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      stats: null,
      loading: true,
      error: null
    }
  }

  async componentDidMount() {
    await this.loadStats()
    // Refresh every 10 seconds
    this.interval = setInterval(() => this.loadStats(), 10000)
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval)
  }

  async loadStats() {
    try {
      const res = await fetch('/api/admin/house/stats')
      const data = await res.json()
      this.setState({ stats: data, loading: false })
    } catch (error) {
      this.setState({ error: error.message, loading: false })
    }
  }

  getHealthStatus(balance) {
    if (balance > 1000) return { color: 'success', text: 'EXCELLENT', width: 100 }
    if (balance > 500) return { color: 'success', text: 'HEALTHY', width: 75 }
    if (balance > 200) return { color: 'warning', text: 'CAUTION', width: 50 }
    if (balance > 50) return { color: 'danger', text: 'LOW', width: 25 }
    return { color: 'danger', text: 'CRITICAL', width: 10 }
  }

  render() {
    const { session } = this.props
    const { stats, loading, error } = this.state

    if (loading) {
      return (
        <Layout {...this.props} navmenu={true}>
          <Container>
            <h1 className="display-4 mt-4">Loading...</h1>
          </Container>
        </Layout>
      )
    }

    if (!session.user || !session.user.admin) {
      return (
        <Layout {...this.props} navmenu={true}>
          <Container>
            <Alert color="danger" className="mt-4">
              Unauthorized. Admin access required.
            </Alert>
          </Container>
        </Layout>
      )
    }

    if (error || !stats) {
      return (
        <Layout {...this.props} navmenu={true}>
          <Container>
            <Alert color="danger" className="mt-4">
              Error loading financial data: {error}
            </Alert>
          </Container>
        </Layout>
      )
    }

    const health = this.getHealthStatus(stats.balance)
    const isProfit = stats.profit >= 0

    return (
      <Layout {...this.props} navmenu={true}>
        <Container className="mt-4 mb-5">
          <h1 className="display-4 mb-4">
            <span className="icon ion-ios-stats mr-2"></span>
            House Financials
          </h1>

          <Alert color="info" className="mb-4">
            <strong>Real-time Tracking:</strong> This page auto-refreshes every 10 seconds.
            All funds are tracked to ensure you can always pay winners.
          </Alert>

          {/* House Health Status */}
          <Card className="mb-4 border-3" style={{borderColor: health.color === 'success' ? '#28a745' : health.color === 'warning' ? '#ffc107' : '#dc3545'}}>
            <CardBody>
              <Row className="align-items-center">
                <Col md="8">
                  <h3>House Bankroll Status</h3>
                  <div className="mt-3 mb-2">
                    <strong>Health: </strong>
                    <Badge color={health.color} className="ml-2" style={{fontSize: '1rem'}}>
                      {health.text}
                    </Badge>
                  </div>
                  <Progress value={health.width} color={health.color} className="mb-3" style={{height: '30px'}}>
                    {health.width}%
                  </Progress>
                </Col>
                <Col md="4" className="text-center">
                  <h2 className="display-3 mb-0" style={{color: health.color === 'success' ? '#28a745' : health.color === 'warning' ? '#ffc107' : '#dc3545'}}>
                    ${stats.balance.toFixed(2)}
                  </h2>
                  <p className="text-muted">Current Balance</p>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Key Metrics */}
          <Row className="mb-4">
            <Col md="6" lg="3" className="mb-3">
              <Card className="h-100">
                <CardBody className="text-center">
                  <div className="mb-2">
                    <span className="icon ion-ios-cash" style={{fontSize: '3em', color: '#28a745'}}></span>
                  </div>
                  <h5 className="text-muted">Total Profit</h5>
                  <h2 className={isProfit ? 'text-success' : 'text-danger'}>
                    ${stats.profit.toFixed(2)}
                  </h2>
                  <Badge color={isProfit ? 'success' : 'danger'}>
                    {isProfit ? 'PROFITABLE' : 'LOSS'}
                  </Badge>
                </CardBody>
              </Card>
            </Col>

            <Col md="6" lg="3" className="mb-3">
              <Card className="h-100">
                <CardBody className="text-center">
                  <div className="mb-2">
                    <span className="icon ion-ios-people" style={{fontSize: '3em', color: '#007bff'}}></span>
                  </div>
                  <h5 className="text-muted">Membership Revenue</h5>
                  <h2 className="text-primary">
                    ${stats.totalMembershipRevenue.toFixed(2)}
                  </h2>
                  <small className="text-muted">100% Profit!</small>
                </CardBody>
              </Card>
            </Col>

            <Col md="6" lg="3" className="mb-3">
              <Card className="h-100">
                <CardBody className="text-center">
                  <div className="mb-2">
                    <span className="icon ion-ios-trending-up" style={{fontSize: '3em', color: '#6c757d'}}></span>
                  </div>
                  <h5 className="text-muted">Bets Received</h5>
                  <h2>
                    ${stats.totalBetsReceived.toFixed(2)}
                  </h2>
                  <small className="text-muted">Total Volume</small>
                </CardBody>
              </Card>
            </Col>

            <Col md="6" lg="3" className="mb-3">
              <Card className="h-100">
                <CardBody className="text-center">
                  <div className="mb-2">
                    <span className="icon ion-ios-trophy" style={{fontSize: '3em', color: '#ffc107'}}></span>
                  </div>
                  <h5 className="text-muted">Payouts</h5>
                  <h2 className="text-warning">
                    ${stats.totalPayouts.toFixed(2)}
                  </h2>
                  <small className="text-muted">To Winners</small>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* ROI Card */}
          <Card className="mb-4 bg-light">
            <CardBody>
              <Row className="align-items-center">
                <Col md="8">
                  <h4>Return on Investment (ROI)</h4>
                  <p className="mb-0">
                    For every $100 bet, you make ${(stats.roi * 1).toFixed(2)} profit.
                  </p>
                  <small className="text-muted">
                    Target: 5% or higher. Current: <strong>{stats.roi}%</strong>
                  </small>
                </Col>
                <Col md="4" className="text-center">
                  <h1 className={stats.roi >= 5 ? 'text-success' : 'text-warning'}>
                    {stats.roi}%
                  </h1>
                  {stats.roi >= 5 ? (
                    <Badge color="success">Excellent Edge</Badge>
                  ) : (
                    <Badge color="warning">Increase Odds Edge</Badge>
                  )}
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Financial Breakdown */}
          <Card>
            <CardBody>
              <h4 className="mb-4">Financial Breakdown</h4>
              <table className="table table-striped">
                <tbody>
                  <tr>
                    <td><strong>Starting Balance</strong></td>
                    <td className="text-right">$0.00</td>
                  </tr>
                  <tr className="table-success">
                    <td><strong>+ Membership Fees (Pure Profit)</strong></td>
                    <td className="text-right text-success">+${stats.totalMembershipRevenue.toFixed(2)}</td>
                  </tr>
                  <tr className="table-info">
                    <td><strong>+ Bets Received</strong></td>
                    <td className="text-right text-info">+${stats.totalBetsReceived.toFixed(2)}</td>
                  </tr>
                  <tr className="table-warning">
                    <td><strong>- Payouts to Winners</strong></td>
                    <td className="text-right text-warning">-${stats.totalPayouts.toFixed(2)}</td>
                  </tr>
                  <tr className="table-active">
                    <td><strong>= Current Balance</strong></td>
                    <td className="text-right"><strong>${stats.balance.toFixed(2)}</strong></td>
                  </tr>
                  <tr className={isProfit ? 'table-success' : 'table-danger'}>
                    <td><strong>Total Profit/Loss</strong></td>
                    <td className={`text-right ${isProfit ? 'text-success' : 'text-danger'}`}>
                      <strong>{isProfit ? '+' : ''}${stats.profit.toFixed(2)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardBody>
          </Card>

          {/* Safety Alerts */}
          {stats.balance < 100 && (
            <Alert color="warning" className="mt-4">
              <h5>Low Bankroll Warning</h5>
              <p>Your house bankroll is below $100. Consider:</p>
              <ul>
                <li>Recruiting more members for membership fees</li>
                <li>Lowering maximum bet limits temporarily</li>
                <li>Increasing odds edge to 7-10%</li>
              </ul>
            </Alert>
          )}

          {stats.roi < 3 && stats.totalBetsReceived > 0 && (
            <Alert color="danger" className="mt-4">
              <h5>Profit Margin Too Low!</h5>
              <p>Your ROI is below 3%. You need to adjust your odds to have more house edge!</p>
              <p><strong>Action Required:</strong> Increase odds edge to at least 5% on all new events.</p>
            </Alert>
          )}

          {stats.balance > 1000 && (
            <Alert color="success" className="mt-4">
              <h5>Excellent Financial Health! 🎉</h5>
              <p>Your bankroll is strong. You can safely:</p>
              <ul>
                <li>Increase maximum bet limits</li>
                <li>Accept more users</li>
                <li>Reduce odds edge slightly for competitive advantage (stay above 3%)</li>
              </ul>
            </Alert>
          )}

          <div className="mt-4 text-center text-muted">
            <small>Last updated: {new Date().toLocaleString()} • Auto-refreshing...</small>
          </div>
        </Container>
      </Layout>
    )
  }
}

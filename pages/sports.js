import React from 'react'
import { Container, Row, Col, Card, CardBody, CardTitle, CardText, Button, Badge, Alert } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'
import Router from 'next/router'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      events: [],
      balance: 0,
      membershipPaid: false,
      selectedBets: {},
      loading: true,
      error: null
    }
  }

  async componentDidMount() {
    await this.loadData()
  }

  async loadData() {
    try {
      // Check if user is logged in
      if (!this.props.session.user) {
        return
      }

      // Load events
      const eventsRes = await fetch('/api/events')
      const eventsData = await eventsRes.json()

      // Load balance
      const balanceRes = await fetch('/api/wallet/balance')
      const balanceData = await balanceRes.json()

      // Check membership status
      const membershipRes = await fetch('/api/wallet/membership-status')
      const membershipData = await membershipRes.json()

      this.setState({
        events: eventsData.events || [],
        balance: balanceData.balance || 0,
        membershipPaid: membershipData.isPaid || false,
        loading: false
      })
    } catch (error) {
      console.error('Error loading data:', error)
      this.setState({ error: error.message, loading: false })
    }
  }

  async placeBet(eventId, selection, odds) {
    const amount = prompt('Enter bet amount ($):')
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert('Invalid amount')
      return
    }

    try {
      const res = await fetch('/api/bets/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          selection,
          amount: parseFloat(amount),
          odds
        })
      })

      const data = await res.json()

      if (res.ok) {
        alert(`Bet placed successfully! Potential win: $${data.bet.potentialWin.toFixed(2)}`)
        await this.loadData()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert(`Error placing bet: ${error.message}`)
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  render() {
    const { session } = this.props
    const { events, balance, membershipPaid, loading, error } = this.state

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
              Please <a href="/auth">sign in</a> to access sports betting.
            </Alert>
          </Container>
        </Layout>
      )
    }

    return (
      <Layout {...this.props} navmenu={true}>
        <Container className="mt-4 mb-5">
          <Row className="mb-4">
            <Col>
              <h1 className="display-4">Sports Betting</h1>
              <p className="lead">Place your bets on upcoming sports events</p>
            </Col>
            <Col md="auto">
              <div className="text-right">
                <h4>Your Balance</h4>
                <h2 className="text-success">${balance.toFixed(2)}</h2>
                <Button color="primary" size="sm" onClick={() => Router.push('/wallet')}>
                  Manage Wallet
                </Button>
              </div>
            </Col>
          </Row>

          {!membershipPaid && (
            <Alert color="info" className="mb-4">
              <h4>Membership Required</h4>
              <p>To place bets, you need to pay a one-time membership fee of ${process.env.MEMBERSHIP_FEE || '10'}.</p>
              <Button color="primary" onClick={() => Router.push('/wallet')}>
                Pay Membership Fee
              </Button>
            </Alert>
          )}

          {error && (
            <Alert color="danger">{error}</Alert>
          )}

          {events.length === 0 ? (
            <Alert color="info">
              No upcoming events at the moment. Check back soon!
            </Alert>
          ) : (
            <Row>
              {events.map(event => (
                <Col md="6" lg="4" key={event._id} className="mb-4">
                  <Card>
                    <CardBody>
                      <CardTitle tag="h5">
                        {event.name}
                        <Badge color="success" className="ml-2">{event.sport}</Badge>
                      </CardTitle>
                      <CardText>
                        <small className="text-muted">
                          {this.formatDate(event.startTime)}
                        </small>
                      </CardText>

                      <div className="mt-3">
                        <h6>Teams</h6>
                        <div className="d-flex justify-content-between mb-2">
                          <span>{event.team1}</span>
                          <Button
                            color="primary"
                            size="sm"
                            disabled={!membershipPaid || event.status !== 'upcoming'}
                            onClick={() => this.placeBet(event._id, event.team1, event.odds1)}
                          >
                            {event.odds1.toFixed(2)}
                          </Button>
                        </div>

                        {event.team2 && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>{event.team2}</span>
                            <Button
                              color="primary"
                              size="sm"
                              disabled={!membershipPaid || event.status !== 'upcoming'}
                              onClick={() => this.placeBet(event._id, event.team2, event.odds2)}
                            >
                              {event.odds2.toFixed(2)}
                            </Button>
                          </div>
                        )}

                        {event.drawOdds && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>Draw</span>
                            <Button
                              color="primary"
                              size="sm"
                              disabled={!membershipPaid || event.status !== 'upcoming'}
                              onClick={() => this.placeBet(event._id, 'Draw', event.drawOdds)}
                            >
                              {event.drawOdds.toFixed(2)}
                            </Button>
                          </div>
                        )}
                      </div>

                      {event.status !== 'upcoming' && (
                        <Badge color="secondary" className="mt-2">{event.status}</Badge>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </Layout>
    )
  }
}

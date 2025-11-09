import React from 'react'
import { Container, Row, Col, Card, CardBody, Button, Alert, Input, Form, FormGroup, Label } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      balance: 0,
      membershipPaid: false,
      depositAmount: 10,
      loading: true,
      success: null,
      error: null
    }
  }

  async componentDidMount() {
    await this.loadData()

    // Check for success parameters
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('membership') === 'success') {
      this.setState({ success: 'Membership activated successfully!' })
    } else if (urlParams.get('session_id')) {
      this.setState({ success: 'Deposit successful!' })
    }
  }

  async loadData() {
    try {
      if (!this.props.session.user) {
        return
      }

      // Load balance
      const balanceRes = await fetch('/api/wallet/balance')
      const balanceData = await balanceRes.json()

      // Check membership status
      const membershipRes = await fetch('/api/wallet/membership-status')
      const membershipData = await membershipRes.json()

      this.setState({
        balance: balanceData.balance || 0,
        membershipPaid: membershipData.isPaid || false,
        loading: false
      })
    } catch (error) {
      console.error('Error loading data:', error)
      this.setState({ error: error.message, loading: false })
    }
  }

  async payMembership() {
    try {
      const res = await fetch('/api/wallet/create-membership-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        this.setState({ error: data.error || 'Failed to create checkout session' })
      }
    } catch (error) {
      this.setState({ error: error.message })
    }
  }

  async deposit() {
    const { depositAmount } = this.state

    if (!depositAmount || depositAmount < 5) {
      this.setState({ error: 'Minimum deposit is $5' })
      return
    }

    try {
      const res = await fetch('/api/wallet/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(depositAmount) })
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        this.setState({ error: data.error || 'Failed to create checkout session' })
      }
    } catch (error) {
      this.setState({ error: error.message })
    }
  }

  render() {
    const { session } = this.props
    const { balance, membershipPaid, depositAmount, loading, success, error } = this.state

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
              Please <a href="/auth">sign in</a> to access your wallet.
            </Alert>
          </Container>
        </Layout>
      )
    }

    return (
      <Layout {...this.props} navmenu={true}>
        <Container className="mt-4 mb-5">
          <h1 className="display-4 mb-4">My Wallet</h1>

          {success && (
            <Alert color="success" toggle={() => this.setState({ success: null })}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert color="danger" toggle={() => this.setState({ error: null })}>
              {error}
            </Alert>
          )}

          <Row>
            <Col md="6" className="mb-4">
              <Card>
                <CardBody>
                  <h3>Current Balance</h3>
                  <h1 className="text-success display-3">${balance.toFixed(2)}</h1>
                  <hr />
                  <p className="text-muted">
                    Membership Status: {membershipPaid ? (
                      <span className="text-success font-weight-bold">Active</span>
                    ) : (
                      <span className="text-danger font-weight-bold">Not Active</span>
                    )}
                  </p>
                </CardBody>
              </Card>
            </Col>

            {!membershipPaid && (
              <Col md="6" className="mb-4">
                <Card className="border-primary">
                  <CardBody>
                    <h4>Activate Membership</h4>
                    <p>Pay a one-time fee of ${process.env.MEMBERSHIP_FEE || '10'} to start betting!</p>
                    <Button color="primary" size="lg" block onClick={() => this.payMembership()}>
                      Pay Membership Fee (${process.env.MEMBERSHIP_FEE || '10'})
                    </Button>
                  </CardBody>
                </Card>
              </Col>
            )}

            <Col md="6" className="mb-4">
              <Card>
                <CardBody>
                  <h4>Deposit Funds</h4>
                  {!membershipPaid && (
                    <Alert color="info" className="mb-3">
                      Please activate your membership first before depositing funds.
                    </Alert>
                  )}
                  <Form onSubmit={(e) => { e.preventDefault(); this.deposit(); }}>
                    <FormGroup>
                      <Label>Amount (USD)</Label>
                      <Input
                        type="number"
                        min="5"
                        step="0.01"
                        value={depositAmount}
                        onChange={(e) => this.setState({ depositAmount: e.target.value })}
                        disabled={!membershipPaid}
                      />
                      <small className="text-muted">Minimum deposit: $5</small>
                    </FormGroup>
                    <Button
                      color="success"
                      size="lg"
                      block
                      type="submit"
                      disabled={!membershipPaid}
                    >
                      Deposit ${depositAmount}
                    </Button>
                  </Form>
                  <hr />
                  <div className="quick-amounts mt-3">
                    <p className="font-weight-bold">Quick amounts:</p>
                    <div className="d-flex justify-content-between">
                      <Button
                        color="outline-primary"
                        size="sm"
                        onClick={() => this.setState({ depositAmount: 10 })}
                        disabled={!membershipPaid}
                      >
                        $10
                      </Button>
                      <Button
                        color="outline-primary"
                        size="sm"
                        onClick={() => this.setState({ depositAmount: 25 })}
                        disabled={!membershipPaid}
                      >
                        $25
                      </Button>
                      <Button
                        color="outline-primary"
                        size="sm"
                        onClick={() => this.setState({ depositAmount: 50 })}
                        disabled={!membershipPaid}
                      >
                        $50
                      </Button>
                      <Button
                        color="outline-primary"
                        size="sm"
                        onClick={() => this.setState({ depositAmount: 100 })}
                        disabled={!membershipPaid}
                      >
                        $100
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Alert color="info" className="mt-4">
            <h5>Secure Payments</h5>
            <p className="mb-0">All payments are securely processed through Stripe. We never store your credit card information.</p>
          </Alert>
        </Container>
      </Layout>
    )
  }
}

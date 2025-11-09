import React from 'react'
import { Container, Row, Col, Card, CardBody, Button, Alert, ListGroup, ListGroupItem, Badge } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      subscription: null,
      loading: true
    }
  }

  async componentDidMount() {
    if (this.props.session.user) {
      try {
        const res = await fetch('/api/subscription')
        const data = await res.json()
        this.setState({ subscription: data, loading: false })
      } catch (error) {
        this.setState({ loading: false })
      }
    } else {
      this.setState({ loading: false })
    }
  }

  async handleUpgrade(plan) {
    if (!this.props.session.user) {
      alert('Please sign in first')
      window.location.href = '/auth'
      return
    }

    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      alert(error.message)
    }
  }

  render() {
    const { session } = this.props
    const { subscription, loading } = this.state

    const currentPlan = subscription?.subscription?.plan || 'free'

    return (
      <Layout {...this.props} navmenu={true}>
        <Container className="mt-4 mb-5">
          <div className="text-center mb-5">
            <h1 className="display-3">Simple, Transparent Pricing</h1>
            <p className="lead">Choose the plan that's right for you</p>
          </div>

          {session.user && subscription && (
            <Alert color="info" className="text-center mb-4">
              <strong>Current Plan:</strong> {currentPlan.toUpperCase()}
              {' - '}
              Invoices this month: {subscription.invoiceCount} / {subscription.remaining === 'Unlimited' ? 'Unlimited' : subscription.subscription.invoiceLimit}
            </Alert>
          )}

          <Row>
            {/* Free Plan */}
            <Col md="6" lg="3" className="mb-4">
              <Card className={`h-100 ${currentPlan === 'free' ? 'border-primary' : ''}`}>
                <CardBody className="d-flex flex-column">
                  {currentPlan === 'free' && (
                    <Badge color="primary" className="mb-2">Current Plan</Badge>
                  )}
                  <h3 className="text-center">Free</h3>
                  <div className="text-center mb-4">
                    <h1 className="display-4">$0</h1>
                    <p className="text-muted">/month</p>
                  </div>
                  <ListGroup flush className="mb-4">
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>3 invoices/month</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Client management</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Basic templates</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-close-circle text-muted mr-2"></span>PDF download</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-close-circle text-muted mr-2"></span>Email invoices</ListGroupItem>
                  </ListGroup>
                  <Button
                    color="outline-primary"
                    block
                    className="mt-auto"
                    onClick={() => window.location.href = '/auth'}
                    disabled={currentPlan === 'free'}
                  >
                    {currentPlan === 'free' ? 'Your Plan' : 'Get Started'}
                  </Button>
                </CardBody>
              </Card>
            </Col>

            {/* Starter Plan */}
            <Col md="6" lg="3" className="mb-4">
              <Card className={`h-100 ${currentPlan === 'starter' ? 'border-success' : ''}`}>
                <CardBody className="d-flex flex-column">
                  {currentPlan === 'starter' && (
                    <Badge color="success" className="mb-2">Current Plan</Badge>
                  )}
                  <h3 className="text-center">Starter</h3>
                  <div className="text-center mb-4">
                    <h1 className="display-4">$10</h1>
                    <p className="text-muted">/month</p>
                  </div>
                  <ListGroup flush className="mb-4">
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>25 invoices/month</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Client management</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Custom templates</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>PDF download</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-close-circle text-muted mr-2"></span>Email invoices</ListGroupItem>
                  </ListGroup>
                  <Button
                    color="primary"
                    block
                    className="mt-auto"
                    onClick={() => this.handleUpgrade('starter')}
                    disabled={currentPlan === 'starter' || currentPlan === 'pro' || currentPlan === 'business'}
                  >
                    {currentPlan === 'starter' ? 'Your Plan' : 'Upgrade Now'}
                  </Button>
                </CardBody>
              </Card>
            </Col>

            {/* Pro Plan */}
            <Col md="6" lg="3" className="mb-4">
              <Card className={`h-100 border-warning ${currentPlan === 'pro' ? 'border-success' : ''}`}>
                <CardBody className="d-flex flex-column">
                  <Badge color="warning" className="mb-2">POPULAR</Badge>
                  {currentPlan === 'pro' && (
                    <Badge color="success" className="mb-2">Current Plan</Badge>
                  )}
                  <h3 className="text-center">Pro</h3>
                  <div className="text-center mb-4">
                    <h1 className="display-4">$20</h1>
                    <p className="text-muted">/month</p>
                  </div>
                  <ListGroup flush className="mb-4">
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span><strong>Unlimited invoices</strong></ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Client management</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Custom branding</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>PDF download</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Email invoices</ListGroupItem>
                  </ListGroup>
                  <Button
                    color="warning"
                    block
                    className="mt-auto"
                    onClick={() => this.handleUpgrade('pro')}
                    disabled={currentPlan === 'pro' || currentPlan === 'business'}
                  >
                    {currentPlan === 'pro' ? 'Your Plan' : 'Upgrade Now'}
                  </Button>
                </CardBody>
              </Card>
            </Col>

            {/* Business Plan */}
            <Col md="6" lg="3" className="mb-4">
              <Card className={`h-100 ${currentPlan === 'business' ? 'border-success' : ''}`}>
                <CardBody className="d-flex flex-column">
                  {currentPlan === 'business' && (
                    <Badge color="success" className="mb-2">Current Plan</Badge>
                  )}
                  <h3 className="text-center">Business</h3>
                  <div className="text-center mb-4">
                    <h1 className="display-4">$30</h1>
                    <p className="text-muted">/month</p>
                  </div>
                  <ListGroup flush className="mb-4">
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span><strong>Unlimited invoices</strong></ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Team collaboration</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Custom branding</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>Priority support</ListGroupItem>
                    <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span>API access</ListGroupItem>
                  </ListGroup>
                  <Button
                    color="dark"
                    block
                    className="mt-auto"
                    onClick={() => this.handleUpgrade('business')}
                    disabled={currentPlan === 'business'}
                  >
                    {currentPlan === 'business' ? 'Your Plan' : 'Upgrade Now'}
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <div className="text-center mt-5">
            <h3>All plans include:</h3>
            <Row className="mt-4">
              <Col md="4">
                <span className="icon ion-ios-lock" style={{fontSize: '3em', color: '#28a745'}}></span>
                <h5 className="mt-2">Secure & Private</h5>
                <p className="text-muted">Your data is encrypted and secure</p>
              </Col>
              <Col md="4">
                <span className="icon ion-ios-flash" style={{fontSize: '3em', color: '#28a745'}}></span>
                <h5 className="mt-2">Lightning Fast</h5>
                <p className="text-muted">Create invoices in under 2 minutes</p>
              </Col>
              <Col md="4">
                <span className="icon ion-ios-people" style={{fontSize: '3em', color: '#28a745'}}></span>
                <h5 className="mt-2">Great Support</h5>
                <p className="text-muted">We're here to help you succeed</p>
              </Col>
            </Row>
          </div>
        </Container>
      </Layout>
    )
  }
}

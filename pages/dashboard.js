import React from 'react'
import Router from 'next/router'
import { Container, Row, Col, Card, CardBody, Button, Alert, Table, Badge } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      invoices: [],
      subscription: null,
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

      const [invoicesRes, subRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/subscription')
      ])

      const invoicesData = await invoicesRes.json()
      const subData = await subRes.json()

      this.setState({
        invoices: invoicesData.invoices || [],
        subscription: subData,
        loading: false
      })
    } catch (error) {
      this.setState({ error: error.message, loading: false })
    }
  }

  async deleteInvoice(id) {
    if (!confirm('Delete this invoice?')) return

    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await this.loadData()
      } else {
        const data = await res.json()
        alert(data.error)
      }
    } catch (error) {
      alert(error.message)
    }
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString()
  }

  formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2)}`
  }

  getStatusBadge(status) {
    const colors = {
      paid: 'success',
      unpaid: 'warning',
      overdue: 'danger'
    }
    return <Badge color={colors[status] || 'secondary'}>{status.toUpperCase()}</Badge>
  }

  render() {
    const { session } = this.props
    const { invoices, subscription, loading, error } = this.state

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
              Please <a href="/auth">sign in</a> to access your dashboard.
            </Alert>
          </Container>
        </Layout>
      )
    }

    const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0)
    const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0)
    const unpaidAmount = totalAmount - paidAmount

    return (
      <Layout {...this.props} navmenu={true}>
        <Container className="mt-4 mb-5">
          <Row className="mb-4">
            <Col>
              <h1 className="display-4">Dashboard</h1>
              <p className="lead">Manage your invoices</p>
            </Col>
            <Col md="auto">
              <Button color="success" size="lg" onClick={() => Router.push('/create-invoice')}>
                <span className="icon ion-ios-add-circle mr-2"></span>
                New Invoice
              </Button>
            </Col>
          </Row>

          {error && <Alert color="danger">{error}</Alert>}

          {/* Subscription Info */}
          {subscription && (
            <Alert color={subscription.subscription.plan === 'free' ? 'info' : 'success'} className="mb-4">
              <Row className="align-items-center">
                <Col md="8">
                  <strong>Plan: {subscription.subscription.plan.toUpperCase()}</strong>
                  {' - '}
                  Invoices this month: {subscription.invoiceCount} / {subscription.remaining === 'Unlimited' ? 'Unlimited' : subscription.subscription.invoiceLimit}
                </Col>
                <Col md="4" className="text-right">
                  {subscription.subscription.plan === 'free' && (
                    <Button color="primary" size="sm" onClick={() => Router.push('/pricing')}>
                      Upgrade Plan
                    </Button>
                  )}
                </Col>
              </Row>
            </Alert>
          )}

          {/* Stats */}
          <Row className="mb-4">
            <Col md="4">
              <Card>
                <CardBody className="text-center">
                  <h3>{invoices.length}</h3>
                  <p className="text-muted mb-0">Total Invoices</p>
                </CardBody>
              </Card>
            </Col>
            <Col md="4">
              <Card className="bg-success text-white">
                <CardBody className="text-center">
                  <h3>{this.formatCurrency(paidAmount)}</h3>
                  <p className="mb-0">Paid</p>
                </CardBody>
              </Card>
            </Col>
            <Col md="4">
              <Card className="bg-warning text-white">
                <CardBody className="text-center">
                  <h3>{this.formatCurrency(unpaidAmount)}</h3>
                  <p className="mb-0">Unpaid</p>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Invoices Table */}
          <Card>
            <CardBody>
              <h4 className="mb-3">Recent Invoices</h4>

              {invoices.length === 0 ? (
                <div className="text-center p-5">
                  <p className="text-muted">No invoices yet</p>
                  <Button color="primary" onClick={() => Router.push('/create-invoice')}>
                    Create Your First Invoice
                  </Button>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => (
                      <tr key={invoice._id}>
                        <td><strong>#{invoice.invoiceNumber}</strong></td>
                        <td>{invoice.clientName}</td>
                        <td>{this.formatDate(invoice.date)}</td>
                        <td>{this.formatCurrency(invoice.total)}</td>
                        <td>{this.getStatusBadge(invoice.status)}</td>
                        <td>
                          <Button color="primary" size="sm" className="mr-2" onClick={() => Router.push(`/invoice/${invoice._id}`)}>
                            View
                          </Button>
                          <Button color="danger" size="sm" onClick={() => this.deleteInvoice(invoice._id)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Container>
      </Layout>
    )
  }
}

import React from 'react'
import Router from 'next/router'
import { Container, Row, Col, Card, CardBody, Button, Form, FormGroup, Label, Input, Alert } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      clients: [],
      invoice: {
        clientName: '',
        clientEmail: '',
        clientAddress: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        items: [{ description: '', quantity: 1, rate: 0 }],
        notes: '',
        status: 'unpaid'
      },
      loading: false,
      error: null
    }
  }

  async componentDidMount() {
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      this.setState({ clients: data.clients || [] })
    } catch (error) {
      console.error(error)
    }
  }

  handleChange(field, value) {
    this.setState({
      invoice: { ...this.state.invoice, [field]: value }
    })
  }

  handleItemChange(index, field, value) {
    const items = [...this.state.invoice.items]
    items[index][field] = value
    this.setState({
      invoice: { ...this.state.invoice, items }
    })
  }

  addItem() {
    this.setState({
      invoice: {
        ...this.state.invoice,
        items: [...this.state.invoice.items, { description: '', quantity: 1, rate: 0 }]
      }
    })
  }

  removeItem(index) {
    const items = this.state.invoice.items.filter((_, i) => i !== index)
    this.setState({
      invoice: { ...this.state.invoice, items }
    })
  }

  calculateTotal() {
    return this.state.invoice.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
    }, 0)
  }

  async handleSubmit(e) {
    e.preventDefault()
    this.setState({ loading: true, error: null })

    try {
      const total = this.calculateTotal()
      const invoiceData = {
        ...this.state.invoice,
        total,
        subtotal: total,
        tax: 0
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })

      const data = await res.json()

      if (res.ok) {
        alert('Invoice created successfully!')
        Router.push('/dashboard')
      } else {
        this.setState({ error: data.error, loading: false })
      }
    } catch (error) {
      this.setState({ error: error.message, loading: false })
    }
  }

  render() {
    const { session } = this.props
    const { invoice, clients, loading, error } = this.state

    if (!session.user) {
      return (
        <Layout {...this.props} navmenu={true}>
          <Container>
            <Alert color="warning" className="mt-4">
              Please <a href="/auth">sign in</a> to create invoices.
            </Alert>
          </Container>
        </Layout>
      )
    }

    const total = this.calculateTotal()

    return (
      <Layout {...this.props} navmenu={true}>
        <Container className="mt-4 mb-5">
          <Row className="mb-4">
            <Col>
              <h1 className="display-4">Create Invoice</h1>
            </Col>
            <Col md="auto">
              <Button color="secondary" onClick={() => Router.push('/dashboard')}>
                <span className="icon ion-ios-arrow-back mr-2"></span>
                Back to Dashboard
              </Button>
            </Col>
          </Row>

          {error && <Alert color="danger">{error}</Alert>}

          <Form onSubmit={(e) => this.handleSubmit(e)}>
            <Card className="mb-4">
              <CardBody>
                <h4 className="mb-3">Client Information</h4>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>Client Name *</Label>
                      <Input
                        type="text"
                        value={invoice.clientName}
                        onChange={(e) => this.handleChange('clientName', e.target.value)}
                        required
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label>Client Email</Label>
                      <Input
                        type="email"
                        value={invoice.clientEmail}
                        onChange={(e) => this.handleChange('clientEmail', e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <FormGroup>
                  <Label>Client Address</Label>
                  <Input
                    type="textarea"
                    rows="2"
                    value={invoice.clientAddress}
                    onChange={(e) => this.handleChange('clientAddress', e.target.value)}
                  />
                </FormGroup>
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody>
                <h4 className="mb-3">Invoice Details</h4>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>Invoice Date *</Label>
                      <Input
                        type="date"
                        value={invoice.date}
                        onChange={(e) => this.handleChange('date', e.target.value)}
                        required
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label>Due Date *</Label>
                      <Input
                        type="date"
                        value={invoice.dueDate}
                        onChange={(e) => this.handleChange('dueDate', e.target.value)}
                        required
                      />
                    </FormGroup>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody>
                <h4 className="mb-3">Items</h4>

                {invoice.items.map((item, index) => (
                  <Row key={index} className="mb-3 align-items-end">
                    <Col md="5">
                      <FormGroup>
                        <Label>Description</Label>
                        <Input
                          type="text"
                          value={item.description}
                          onChange={(e) => this.handleItemChange(index, 'description', e.target.value)}
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => this.handleItemChange(index, 'quantity', e.target.value)}
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label>Rate ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => this.handleItemChange(index, 'rate', e.target.value)}
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label>Amount</Label>
                        <Input
                          type="text"
                          value={`$${((item.quantity || 0) * (item.rate || 0)).toFixed(2)}`}
                          disabled
                        />
                      </FormGroup>
                    </Col>
                    <Col md="1">
                      <FormGroup>
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => this.removeItem(index)}
                          disabled={invoice.items.length === 1}
                        >
                          <span className="icon ion-ios-trash"></span>
                        </Button>
                      </FormGroup>
                    </Col>
                  </Row>
                ))}

                <Button color="secondary" size="sm" onClick={() => this.addItem()}>
                  <span className="icon ion-ios-add-circle mr-2"></span>
                  Add Item
                </Button>

                <div className="mt-4 text-right">
                  <h4>Total: <span className="text-success">${total.toFixed(2)}</span></h4>
                </div>
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody>
                <FormGroup>
                  <Label>Notes</Label>
                  <Input
                    type="textarea"
                    rows="3"
                    value={invoice.notes}
                    onChange={(e) => this.handleChange('notes', e.target.value)}
                    placeholder="Payment terms, thank you note, etc."
                  />
                </FormGroup>
              </CardBody>
            </Card>

            <div className="text-right">
              <Button color="secondary" className="mr-3" onClick={() => Router.push('/dashboard')}>
                Cancel
              </Button>
              <Button color="success" size="lg" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </Form>
        </Container>
      </Layout>
    )
  }
}

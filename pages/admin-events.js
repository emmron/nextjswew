import React from 'react'
import { Container, Row, Col, Card, CardBody, Button, Table, Form, FormGroup, Label, Input, Alert, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      events: [],
      modal: false,
      settleModal: false,
      selectedEvent: null,
      newEvent: {
        name: '',
        sport: 'Football',
        team1: '',
        team2: '',
        odds1: 2.0,
        odds2: 2.0,
        drawOdds: 3.0,
        startTime: ''
      },
      winner: '',
      loading: true,
      error: null,
      success: null
    }
  }

  async componentDidMount() {
    await this.loadData()
  }

  async loadData() {
    try {
      const res = await fetch('/api/events/all')
      const data = await res.json()
      this.setState({
        events: data.events || [],
        loading: false
      })
    } catch (error) {
      this.setState({ error: error.message, loading: false })
    }
  }

  toggleModal() {
    this.setState({ modal: !this.state.modal })
  }

  toggleSettleModal(event = null) {
    this.setState({
      settleModal: !this.state.settleModal,
      selectedEvent: event,
      winner: ''
    })
  }

  handleInputChange(field, value) {
    this.setState({
      newEvent: {
        ...this.state.newEvent,
        [field]: value
      }
    })
  }

  async createEvent(e) {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.state.newEvent)
      })

      const data = await res.json()

      if (res.ok) {
        this.setState({
          success: 'Event created successfully!',
          modal: false,
          newEvent: {
            name: '',
            sport: 'Football',
            team1: '',
            team2: '',
            odds1: 2.0,
            odds2: 2.0,
            drawOdds: 3.0,
            startTime: ''
          }
        })
        await this.loadData()
      } else {
        this.setState({ error: data.error })
      }
    } catch (error) {
      this.setState({ error: error.message })
    }
  }

  async settleEvent() {
    const { selectedEvent, winner } = this.state

    if (!winner) {
      this.setState({ error: 'Please select a winner' })
      return
    }

    try {
      const res = await fetch(`/api/admin/events/${selectedEvent._id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner })
      })

      const data = await res.json()

      if (res.ok) {
        this.setState({
          success: 'Event settled successfully!',
          settleModal: false,
          selectedEvent: null,
          winner: ''
        })
        await this.loadData()
      } else {
        this.setState({ error: data.error })
      }
    } catch (error) {
      this.setState({ error: error.message })
    }
  }

  async deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (res.ok) {
        this.setState({ success: 'Event deleted successfully!' })
        await this.loadData()
      } else {
        this.setState({ error: data.error })
      }
    } catch (error) {
      this.setState({ error: error.message })
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  render() {
    const { session } = this.props
    const { events, modal, settleModal, selectedEvent, newEvent, winner, loading, error, success } = this.state

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

    return (
      <Layout {...this.props} navmenu={true}>
        <Container className="mt-4 mb-5">
          <Row className="mb-4">
            <Col>
              <h1 className="display-4">Manage Events</h1>
            </Col>
            <Col md="auto">
              <Button color="primary" size="lg" onClick={() => this.toggleModal()}>
                Create New Event
              </Button>
            </Col>
          </Row>

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

          <Table responsive striped>
            <thead>
              <tr>
                <th>Event</th>
                <th>Sport</th>
                <th>Teams</th>
                <th>Odds</th>
                <th>Start Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event._id}>
                  <td><strong>{event.name}</strong></td>
                  <td>{event.sport}</td>
                  <td>
                    {event.team1} vs {event.team2}
                  </td>
                  <td>
                    {event.odds1} / {event.odds2}
                    {event.drawOdds && ` / ${event.drawOdds}`}
                  </td>
                  <td>{this.formatDate(event.startTime)}</td>
                  <td>
                    <span className={`badge badge-${event.status === 'upcoming' ? 'primary' : event.status === 'live' ? 'success' : 'secondary'}`}>
                      {event.status}
                    </span>
                    {event.winner && <div><small>Winner: {event.winner}</small></div>}
                  </td>
                  <td>
                    {event.status !== 'finished' && (
                      <>
                        <Button
                          color="success"
                          size="sm"
                          className="mr-2"
                          onClick={() => this.toggleSettleModal(event)}
                        >
                          Settle
                        </Button>
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => this.deleteEvent(event._id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {events.length === 0 && (
            <Alert color="info">No events found. Create your first event!</Alert>
          )}

          {/* Create Event Modal */}
          <Modal isOpen={modal} toggle={() => this.toggleModal()} size="lg">
            <ModalHeader toggle={() => this.toggleModal()}>Create New Event</ModalHeader>
            <Form onSubmit={(e) => this.createEvent(e)}>
              <ModalBody>
                <FormGroup>
                  <Label>Event Name</Label>
                  <Input
                    type="text"
                    value={newEvent.name}
                    onChange={(e) => this.handleInputChange('name', e.target.value)}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Sport</Label>
                  <Input
                    type="select"
                    value={newEvent.sport}
                    onChange={(e) => this.handleInputChange('sport', e.target.value)}
                  >
                    <option>Football</option>
                    <option>Basketball</option>
                    <option>Baseball</option>
                    <option>Hockey</option>
                    <option>Soccer</option>
                    <option>Tennis</option>
                    <option>MMA</option>
                    <option>Boxing</option>
                  </Input>
                </FormGroup>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>Team 1</Label>
                      <Input
                        type="text"
                        value={newEvent.team1}
                        onChange={(e) => this.handleInputChange('team1', e.target.value)}
                        required
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label>Team 1 Odds</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newEvent.odds1}
                        onChange={(e) => this.handleInputChange('odds1', parseFloat(e.target.value))}
                        required
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>Team 2</Label>
                      <Input
                        type="text"
                        value={newEvent.team2}
                        onChange={(e) => this.handleInputChange('team2', e.target.value)}
                        required
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label>Team 2 Odds</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newEvent.odds2}
                        onChange={(e) => this.handleInputChange('odds2', parseFloat(e.target.value))}
                        required
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <FormGroup>
                  <Label>Draw Odds (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newEvent.drawOdds}
                    onChange={(e) => this.handleInputChange('drawOdds', parseFloat(e.target.value))}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={newEvent.startTime}
                    onChange={(e) => this.handleInputChange('startTime', e.target.value)}
                    required
                  />
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" onClick={() => this.toggleModal()}>Cancel</Button>
                <Button color="primary" type="submit">Create Event</Button>
              </ModalFooter>
            </Form>
          </Modal>

          {/* Settle Event Modal */}
          <Modal isOpen={settleModal} toggle={() => this.toggleSettleModal()}>
            <ModalHeader toggle={() => this.toggleSettleModal()}>Settle Event</ModalHeader>
            <ModalBody>
              {selectedEvent && (
                <>
                  <h5>{selectedEvent.name}</h5>
                  <FormGroup tag="fieldset">
                    <legend>Select Winner:</legend>
                    <FormGroup check>
                      <Label check>
                        <Input
                          type="radio"
                          name="winner"
                          value={selectedEvent.team1}
                          checked={winner === selectedEvent.team1}
                          onChange={(e) => this.setState({ winner: e.target.value })}
                        />{' '}
                        {selectedEvent.team1}
                      </Label>
                    </FormGroup>
                    <FormGroup check>
                      <Label check>
                        <Input
                          type="radio"
                          name="winner"
                          value={selectedEvent.team2}
                          checked={winner === selectedEvent.team2}
                          onChange={(e) => this.setState({ winner: e.target.value })}
                        />{' '}
                        {selectedEvent.team2}
                      </Label>
                    </FormGroup>
                    {selectedEvent.drawOdds && (
                      <FormGroup check>
                        <Label check>
                          <Input
                            type="radio"
                            name="winner"
                            value="Draw"
                            checked={winner === 'Draw'}
                            onChange={(e) => this.setState({ winner: e.target.value })}
                          />{' '}
                          Draw
                        </Label>
                      </FormGroup>
                    )}
                  </FormGroup>
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={() => this.toggleSettleModal()}>Cancel</Button>
              <Button color="success" onClick={() => this.settleEvent()}>Settle Event</Button>
            </ModalFooter>
          </Modal>
        </Container>
      </Layout>
    )
  }
}

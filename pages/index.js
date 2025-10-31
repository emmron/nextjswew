import Link from 'next/link'
import React from 'react'
import Router from 'next/router'
import { Container, Row, Col, Button, Jumbotron, Card, CardBody, CardTitle, CardText, Badge } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  constructor(props) {
    super(props)
    this.state = {
      events: [],
      loading: true
    }
  }

  async componentDidMount() {
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      this.setState({
        events: data.events ? data.events.slice(0, 6) : [],
        loading: false
      })
    } catch (error) {
      console.error('Error loading events:', error)
      this.setState({ loading: false })
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  render() {
    const { events, loading } = this.state

    return (
      <Layout {...this.props} navmenu={true} container={false}>
        <Jumbotron className="text-light rounded-0" style={{
          backgroundColor: 'rgba(40,167,69,1)',
          background: 'linear-gradient(135deg, rgba(40,167,69,1) 0%, rgba(25,135,84,1) 100%)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.1)'
          }}>
          <Container className="mt-2 mb-2">
            <h1 className="display-2 mb-3" style={{fontWeight: 600}}>
              <span className="icon ion-ios-trophy mr-3"></span>
              SportsBet
            </h1>
            <p className="lead mb-4">
              Bet on your favorite sports. Win big.
            </p>
            <p>
              {this.props.session.user ? (
                <>
                  <Button color="light" size="lg" className="mr-3" onClick={() => Router.push('/sports')}>
                    <span className="icon ion-ios-football mr-2"></span> View All Events
                  </Button>
                  <Button color="outline-light" size="lg" onClick={() => Router.push('/wallet')}>
                    <span className="icon ion-ios-wallet mr-2"></span> My Wallet
                  </Button>
                </>
              ) : (
                <>
                  <Button color="light" size="lg" className="mr-3" onClick={() => Router.push('/auth')}>
                    <span className="icon ion-ios-log-in mr-2"></span> Sign In
                  </Button>
                  <Button color="outline-light" size="lg" onClick={() => Router.push('/auth')}>
                    <span className="icon ion-ios-person-add mr-2"></span> Sign Up
                  </Button>
                </>
              )}
            </p>
            <style jsx>{`
              .display-2  {
                text-shadow: 0 5px 10px rgba(0,0,0,0.3);
                color: rgba(255,255,255,0.95);
              }
              .lead {
                font-size: 2em;
                opacity: 0.9;
              }
              @media (max-width: 767px) {
                .display-2 {
                  font-size: 3em;
                  margin-bottom: 1em;
                }
                .lead {
                  font-size: 1.5em;
                }
              }
            `}</style>
          </Container>
        </Jumbotron>

        <Container className="mt-5 mb-5">
          <h2 className="text-center display-4 mb-4">Featured Events</h2>

          {loading ? (
            <p className="text-center">Loading events...</p>
          ) : events.length === 0 ? (
            <div className="text-center p-5 bg-light rounded">
              <h4>No events available yet</h4>
              <p className="text-muted">Check back soon for upcoming sports events!</p>
            </div>
          ) : (
            <Row>
              {events.map(event => (
                <Col md="6" lg="4" key={event._id} className="mb-4">
                  <Card className="h-100">
                    <CardBody>
                      <CardTitle tag="h5">
                        {event.name}
                        <Badge color="success" className="ml-2">{event.sport}</Badge>
                      </CardTitle>
                      <CardText>
                        <small className="text-muted">
                          <span className="icon ion-ios-time mr-1"></span>
                          {this.formatDate(event.startTime)}
                        </small>
                      </CardText>
                      <div className="mt-3">
                        <div className="d-flex justify-content-between mb-2">
                          <strong>{event.team1}</strong>
                          <Badge color="primary">{event.odds1.toFixed(2)}</Badge>
                        </div>
                        {event.team2 && (
                          <div className="d-flex justify-content-between">
                            <strong>{event.team2}</strong>
                            <Badge color="primary">{event.odds2.toFixed(2)}</Badge>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          <div className="text-center mt-4">
            <Button color="success" size="lg" onClick={() => Router.push('/sports')}>
              View All Events
            </Button>
          </div>

          <Row className="mt-5 pt-5">
            <Col md="4" className="text-center mb-4">
              <div className="p-4">
                <span className="icon ion-ios-lock" style={{fontSize: '3em', color: '#28a745'}}></span>
                <h4 className="mt-3">Secure Payments</h4>
                <p className="text-muted">All transactions secured by Stripe</p>
              </div>
            </Col>
            <Col md="4" className="text-center mb-4">
              <div className="p-4">
                <span className="icon ion-ios-flash" style={{fontSize: '3em', color: '#28a745'}}></span>
                <h4 className="mt-3">Instant Deposits</h4>
                <p className="text-muted">Add funds and start betting immediately</p>
              </div>
            </Col>
            <Col md="4" className="text-center mb-4">
              <div className="p-4">
                <span className="icon ion-ios-trophy" style={{fontSize: '3em', color: '#28a745'}}></span>
                <h4 className="mt-3">Big Wins</h4>
                <p className="text-muted">Competitive odds on all major sports</p>
              </div>
            </Col>
          </Row>
        </Container>
      </Layout>
    )
  }
}
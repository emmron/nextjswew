import Link from 'next/link'
import React from 'react'
import Router from 'next/router'
import { Container, Row, Col, Button, Jumbotron, Card, CardBody, ListGroup, ListGroupItem } from 'reactstrap'
import Page from '../components/page'
import Layout from '../components/layout'

export default class extends Page {
  render() {
    return (
      <Layout {...this.props} navmenu={false} container={false}>
        <Jumbotron className="text-light rounded-0" style={{
          backgroundColor: 'rgba(40,167,69,1)',
          background: 'linear-gradient(135deg, rgba(40,167,69,1) 0%, rgba(25,135,84,1) 100%)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.1)'
          }}>
          <Container className="mt-2 mb-2">
            <h1 className="display-2 mb-3" style={{fontWeight: 600}}>
              <span className="icon ion-ios-document mr-3"></span>
              InvoiceFlow
            </h1>
            <p className="lead mb-4">
              Create professional invoices in minutes. Free forever.
            </p>
            <p>
              {this.props.session.user ? (
                <>
                  <Button color="light" size="lg" className="mr-3" onClick={() => Router.push('/dashboard')}>
                    <span className="icon ion-ios-speedometer mr-2"></span> Go to Dashboard
                  </Button>
                  <Button color="outline-light" size="lg" onClick={() => Router.push('/create-invoice')}>
                    <span className="icon ion-ios-add-circle mr-2"></span> New Invoice
                  </Button>
                </>
              ) : (
                <>
                  <Button color="light" size="lg" className="mr-3" onClick={() => Router.push('/auth')}>
                    <span className="icon ion-ios-log-in mr-2"></span> Get Started Free
                  </Button>
                  <Button color="outline-light" size="lg" onClick={() => Router.push('/pricing')}>
                    <span className="icon ion-ios-pricetag mr-2"></span> View Pricing
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
          <h2 className="text-center display-4 mb-4">Why InvoiceFlow?</h2>

          <Row>
            <Col md="4" className="mb-4">
              <Card className="h-100 text-center">
                <CardBody>
                  <span className="icon ion-ios-flash" style={{fontSize: '4em', color: '#28a745'}}></span>
                  <h4 className="mt-3">Lightning Fast</h4>
                  <p className="text-muted">Create professional invoices in under 2 minutes</p>
                </CardBody>
              </Card>
            </Col>
            <Col md="4" className="mb-4">
              <Card className="h-100 text-center">
                <CardBody>
                  <span className="icon ion-ios-cash" style={{fontSize: '4em', color: '#28a745'}}></span>
                  <h4 className="mt-3">Free Forever</h4>
                  <p className="text-muted">3 invoices/month free. Upgrade anytime for more.</p>
                </CardBody>
              </Card>
            </Col>
            <Col md="4" className="mb-4">
              <Card className="h-100 text-center">
                <CardBody>
                  <span className="icon ion-ios-lock" style={{fontSize: '4em', color: '#28a745'}}></span>
                  <h4 className="mt-3">Secure & Private</h4>
                  <p className="text-muted">Your data is encrypted and never shared</p>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <div className="text-center mt-5 p-5 bg-light rounded">
            <h2 className="mb-4">Perfect for Freelancers & Small Businesses</h2>
            <Row>
              <Col md="6">
                <ListGroup flush className="text-left">
                  <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span> Create unlimited clients</ListGroupItem>
                  <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span> Track payment status</ListGroupItem>
                  <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span> Professional templates</ListGroupItem>
                </ListGroup>
              </Col>
              <Col md="6">
                <ListGroup flush className="text-left">
                  <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span> Automatic invoice numbering</ListGroupItem>
                  <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span> Custom branding (Pro)</ListGroupItem>
                  <ListGroupItem><span className="icon ion-ios-checkmark-circle text-success mr-2"></span> Email invoices (Pro)</ListGroupItem>
                </ListGroup>
              </Col>
            </Row>
            <Button color="success" size="lg" className="mt-4" onClick={() => Router.push('/auth')}>
              Start Creating Invoices Free
            </Button>
          </div>

          <Row className="mt-5 pt-5">
            <Col md="4" className="text-center mb-4">
              <div className="p-4">
                <h1 className="display-4 text-success">2 min</h1>
                <p className="text-muted">Average time to create an invoice</p>
              </div>
            </Col>
            <Col md="4" className="text-center mb-4">
              <div className="p-4">
                <h1 className="display-4 text-success">$0</h1>
                <p className="text-muted">Forever free plan available</p>
              </div>
            </Col>
            <Col md="4" className="text-center mb-4">
              <div className="p-4">
                <h1 className="display-4 text-success">100%</h1>
                <p className="text-muted">Secure and encrypted</p>
              </div>
            </Col>
          </Row>
        </Container>
      </Layout>
    )
  }
}

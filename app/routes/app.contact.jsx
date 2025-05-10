import React, { useState } from 'react';
import '../styles/globals.css';
import Footer from '../components/Footer';
import tutorialIcon from '../assets/tutorialIcon.png';
import { PlayIcon } from '@shopify/polaris-icons';
import { EmailIcon, ChatIcon, NoteIcon } from '@shopify/polaris-icons';

import {
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Button,
  ButtonGroup,
  Pagination,
  Icon,
  Collapsible,
  Link,
  Box,
  Page,
  TextField,
  Select,
  InlineStack,
  Divider
} from '@shopify/polaris';

const tutorialData = [
  {
    title: 'Getting Started with Shopify Polaris',
    desc: "Learn how to set up your first Shopify app using the Polaris design system.",
    video: 'https://www.youtube.com/watch?v=F1vQ5cF6nq8',
    instruction: 'https://polaris.shopify.com/getting-started',
  },
  {
    title: 'How to Add Custom Fields to Products',
    desc: "This tutorial shows you how to add and manage custom fields in your Shopify products.",
    video: 'https://www.youtube.com/watch?v=2Q6p6QG8b8A',
    instruction: 'https://help.shopify.com/manual/products/add-update-products',
  },
  {
    title: 'Using Polaris Components in React',
    desc: "A step-by-step guide to using Polaris React components in your Shopify app.",
    video: 'https://www.youtube.com/watch?v=3nQNiWdeH2Q',
    instruction: 'https://polaris.shopify.com/components',
  },
  {
    title: 'Implementing Pagination with Polaris',
    desc: "Learn how to add and customize pagination in your Shopify admin pages using Polaris.",
    video: 'https://www.youtube.com/watch?v=4QFQ4QG8b8A',
    instruction: 'https://polaris.shopify.com/components/navigation/pagination',
  },
];

const faqs = [
  'Why does the option not appear on my product detail page?',
  'Why does the option not appear on my product detail page?',
  'Why does the option not appear on my product detail page?',
  'Why does the option not appear on my product detail page?',
  'Why does the option not appear on my product detail page?',
];

const reasonOptions = [
  { label: 'Other', value: 'other' },
  { label: 'Technical Issue', value: 'technical' },
  { label: 'Billing', value: 'billing' },
  { label: 'Feature Request', value: 'feature' },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    code: '',
    password: '',
    reason: 'other',
    page: '',
    message: '',
  });
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [tutorialPage, setTutorialPage] = useState(1);
  const TUTORIALS_PER_PAGE = 2;
  const totalPages = Math.ceil(tutorialData.length / TUTORIALS_PER_PAGE);
  const pagedTutorials = tutorialData.slice(
    (tutorialPage - 1) * TUTORIALS_PER_PAGE,
    tutorialPage * TUTORIALS_PER_PAGE
  );

  const reasons = [
    { label: 'Other', value: 'other' },
    { label: 'Billing', value: 'billing' },
    { label: 'Technical', value: 'technical' },
    { label: 'Feature Request', value: 'feature' },
  ];

  const handleChange = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitResult(null);
    // Simulate API call
    setTimeout(() => {
      setSubmitResult({ success: true, message: 'Message sent!' });
      setForm({
        name: '',
        email: '',
        code: '',
        password: '',
        reason: 'other',
        page: '',
        message: '',
      });
    }, 1000);
  };

  return (
    <Page>
      <Box paddingBlockStart="400" paddingBlockEnd="400" display="flex" justifyContent="center">
        <Card>
          <Box padding="600" minWidth="700px" maxWidth="900px">
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2" fontWeight="bold">
                Contact Us
              </Text>
              <Text variant="headingMd" fontWeight="semibold">
                Store Information
              </Text>
              <InlineStack gap="200">
                <Box width="49%">
                  <TextField
                    label="Your name"
                    value={form.name}
                    onChange={handleChange('name')}
                    autoComplete="name"
                  />
                </Box>
                <Box width="50%">
                  <TextField
                    label="Your email"
                    value={form.email}
                    onChange={handleChange('email')}
                    autoComplete="email"
                    helpText="We'll use this address if we need to contact you about your account."
                  />
                </Box>
              </InlineStack>
              <InlineStack gap="200">
                <Box width="49%">
                  <TextField
                    label="Collaborator request code"
                    value={form.code}
                    onChange={handleChange('code')}
                    autoComplete="off"
                    requiredIndicator
                  />
                  <Text color="subdued" fontSize="bodySm">
                    To find the 4-digit access code, please follow the steps below:<br />
                    Navigate to your Shopify store admin &gt; Settings &gt; Users &gt; Security &gt; Store security &gt; Collaborators, and there's your code!
                  </Text>
                </Box>
                <Box width="50%">
                  <TextField
                    label="Store password"
                    value={form.password}
                    onChange={handleChange('password')}
                    autoComplete="off"
                  />
                  <Text color="subdued" fontSize="bodySm">
                    Password to access the website if available
                  </Text>
                </Box>
              </InlineStack>
              <Divider />
              <Select
                label="Reason for contacting"
                options={reasons}
                value={form.reason}
                onChange={handleChange('reason')}
              />
              <TextField
                label="Page information"
                value={form.page}
                onChange={handleChange('page')}
                helpText="Information about the page you are having problems with such as page title, page url"
              />
              <TextField
                label="Message"
                value={form.message}
                onChange={handleChange('message')}
                multiline={4}
                requiredIndicator
                helpText="Information about the page you are having problems with such as page title, page url"
              />
              <Divider />
              <Box>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" onClick={handleSubmit}>Send</Button>
                </div>
              </Box>
            </BlockStack>
          </Box>
        </Card>
      </Box>

      {/* Tutorials */}
      <div style={{ marginBottom: 24 }}>
        <Card padding="500" background="bg-surface" borderRadius="2xl" paddingBlockStart="600" paddingBlockEnd="600">
          <BlockStack gap="200">
            <Text variant="headingMd">Quick tutorials</Text>
            <Text color="subdued">This is where an optional subheading can go</Text>
            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
              {pagedTutorials.map((tut, idx) => (
                <Card key={idx} padding="400">
                  <Box background="bg-surface">
                    <BlockStack gap="100">
                      <Box
                        width="48px"
                        height="48px"
                        borderRadius="full"
                        background="#8B5CF6"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        marginInlineEnd="200"
                      >
                        <img src={tutorialIcon} alt="Tutorial" style={{ width: 28, height: 28 }} />
                      </Box>
                      <Text variant="headingSm">{tut.title}</Text>
                      <Text>{tut.desc}</Text>
                      <ButtonGroup>
                        <Button url={tut.video} icon={PlayIcon}>Watch video</Button>
                        <Link url={tut.instruction} style={{ color: '#3574F2', fontWeight: 500 }}>
                          Read instruction
                        </Link>
                      </ButtonGroup>
                    </BlockStack>
                  </Box>
                </Card>
              ))}
            </InlineGrid>
            <Box display="flex" alignItems="center" justifyContent="space-between" marginBlockStart="4">
              <Pagination
                hasPrevious={tutorialPage > 1}
                onPrevious={() => setTutorialPage(tutorialPage - 1)}
                hasNext={tutorialPage < totalPages}
                onNext={() => setTutorialPage(tutorialPage + 1)}
                label={`${tutorialPage}/${totalPages}`}
              />
            </Box>
          </BlockStack>
        </Card>
      </div>

      {/* Help Section */ /* FAQ Section */}
      <div style={{ marginBottom: 24 }}>
        <Card paddingBlockStart="600" paddingBlockEnd="600" background="bg-surface" borderRadius="2xl">
          <div style={{ padding: '5px 0px 11px 2px' }}>
            <Text variant="headingMd" as="h2" fontWeight="bold">
              Need help or Import?
            </Text>
          </div>
          <InlineGrid columns={3} gap="400" style={{ width: '100%' }}>
            <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
              <Box display="flex" alignItems="center">
                <Icon source={EmailIcon} color="interactive" />
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }}>
                    Get email support
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    Email us and we'll get back to you as soon as possible.
                  </Text>
                </Box>
              </Box>
            </Card>
            <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
              <Box display="flex" alignItems="center">
                <Icon source={ChatIcon} color="interactive" />
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }}>
                    Start live chat
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    Talk to us directly via live chat to get help with your question.
                  </Text>
                </Box>
              </Box>
            </Card>
            <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
              <Box display="flex" alignItems="center">
                <Icon source={NoteIcon} color="interactive" />
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }}>
                    Help docs
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    Find a solution for your problem with documents and tutorials.
                  </Text>
                </Box>
              </Box>
            </Card>
          </InlineGrid>
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginTop: 24 }}>
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: 12,
                    background: '#F6F6F7',
                    borderRadius: 12,
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.2s',
                    boxShadow: selectedFaq === idx ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                  }}
                >
                  <button
                    onClick={() => setSelectedFaq(selectedFaq === idx ? null : idx)}
                    aria-expanded={selectedFaq === idx}
                    aria-controls={`faq-${idx}`}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      fontWeight: 500,
                      fontSize: 15,
                      cursor: 'pointer',
                      color: '#202223',
                      borderRadius: 12,
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = '#EFEFEF')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ flex: 1, textAlign: 'left' }}>{faq}</span>
                    <span
                      style={{
                        transform: selectedFaq === idx ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: '#8C9196',
                        fontSize: 20,
                        marginLeft: 8,
                      }}
                    >
                      &#8250;
                    </span>
                  </button>
                  <Collapsible
                    open={selectedFaq === idx}
                    id={`faq-${idx}`}
                    transition={{ duration: '400ms', timingFunction: 'ease-in-out' }}
                  >
                    <div
                      style={{
                        padding: '0 24px 20px 24px',
                        color: '#6D7175',
                        fontSize: 15,
                        background: '#F6F6F7',
                        borderRadius: '0 0 12px 12px',
                        marginTop: 14,
                      }}
                    >
                      Here is the answer to your question.
                    </div>
                  </Collapsible>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <Footer />
    </Page>
  );
} 
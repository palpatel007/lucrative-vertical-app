import React, { useState, useCallback } from 'react';
import {
  Page,
  Text,
  Box,
  Button,
  Card,
  Link,
  BlockStack,
  InlineGrid,
  ButtonGroup,
  Pagination,
  Icon,
  Collapsible,
  Popover,
  ActionList,
  DropZone,
  InlineStack
} from '@shopify/polaris';
import '../styles/globals.css';
import Footer from '../components/Footer';
import CustomDropdown from '../components/CustomDropdown';
import tutorialIcon from '../assets/tutorialIcon.png';
import { PlayIcon } from '@shopify/polaris-icons';
import { EmailIcon, ChatIcon, NoteIcon, CheckSmallIcon } from '@shopify/polaris-icons';

const sourceOptions = [
  { label: 'Amazon Seller', value: 'amazon' },
  { label: 'Walmart Seller', value: 'walmart' },
  { label: 'Ebay Seller', value: 'ebay' },
  { label: 'AliExpress', value: 'aliexpress' },
  { label: 'WooCommerce', value: 'woocommerce' },
  { label: 'Wix Seller', value: 'wix' },
  { label: 'Alibaba', value: 'alibaba' },
  { label: 'Etsy', value: 'etsy' },
  { label: 'Squarespace', value: 'squarespace' },
  { label: 'BigCommerce', value: 'bigcommerce' },
  { label: 'Custom CSV', value: 'customcsv' },
];

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

function SourceDropdown({ selectedSource, setSelectedSource }) {
  const [active, setActive] = useState(false);
  const toggleActive = useCallback(() => setActive((active) => !active), []);
  const options = [
    { label: 'Amazon Seller', value: 'amazon' },
    { label: 'Walmart Seller', value: 'walmart' },
    { label: 'Ebay Seller', value: 'ebay' },
    { label: 'AliExpress', value: 'aliexpress' },
    { label: 'WooCommerce', value: 'woocommerce' },
    { label: 'Wix Seller', value: 'wix' },
    { label: 'Alibaba', value: 'alibaba' },
    { label: 'Etsy', value: 'etsy' },
    { label: 'Squarespace', value: 'squarespace' },
    { label: 'BigCommerce', value: 'bigcommerce' },
    { label: 'Custom CSV', value: 'customcsv' },
  ];
  const activator = (
    <Button onClick={toggleActive} disclosure>
      {options.find(opt => opt.value === selectedSource)?.label || 'Select source'}
    </Button>
  );
  return (
    <Popover
      active={active}
      activator={activator}
      autofocusTarget="first-node"
      onClose={toggleActive}
    >
      <ActionList
        actionRole="menuitem"
        items={options.map(opt => ({
          content: opt.label,
          active: selectedSource === opt.value,
          suffix: selectedSource === opt.value ? <Icon source={CheckSmallIcon} /> : undefined,
          onAction: () => {
            setSelectedSource(opt.value);
            setActive(false);
          },
        }))}
      />
    </Popover>
  );
}

export default function Import() {
  const [selectedPlatform, setSelectedPlatform] = useState('shopify');
  const [file, setFile] = useState(null);
  const [selectedSource, setSelectedSource] = useState(sourceOptions[0]);
  const [popoverActive, setPopoverActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [tutorialPage, setTutorialPage] = useState(1);
  const TUTORIALS_PER_PAGE = 2;
  const totalPages = Math.ceil(tutorialData.length / TUTORIALS_PER_PAGE);
  const pagedTutorials = tutorialData.slice(
    (tutorialPage - 1) * TUTORIALS_PER_PAGE,
    tutorialPage * TUTORIALS_PER_PAGE
  );

  const handleDropZoneDrop = useCallback((_dropFiles, acceptedFiles) => setFiles(acceptedFiles), []);

  const handleImportClick = async () => {
    if (files.length === 0) return;
    setImportLoading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('csv', files[0]);
    formData.append('format', selectedSource.value); // e.g., 'shopify', 'woocommerce', etc.
    formData.append('shop', shopDomain);

    try {
      const response = await fetch('/api/csv-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setImportResult({ success: true, message: `Imported ${result.results.successful} products!` });
      } else {
        setImportResult({ success: false, message: result.error || 'Import failed.' });
      }
    } catch (error) {
      setImportResult({ success: false, message: error.message });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <Page>
      <Box paddingBlockStart="400" paddingBlockEnd="400" display="flex" justifyContent="center">
        <Card>
          <Box padding="600" minWidth="920px" maxWidth="700px">
            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
              <Text variant="headingMd" as="h2" fontWeight="bold">
                Import Product
              </Text>
              <Box width="100%" display="flex" flexDirection="column" alignItems="center">
                <Text variant="bodyMd" as="div" fontWeight="medium" alignment="center" paddingBlockEnd="100">
                  Select your Source File
                </Text>
                <div align="center">
                <SourceDropdown selectedSource={selectedSource.value} setSelectedSource={val => setSelectedSource(sourceOptions.find(opt => opt.value === val))} />
                </div>
              </Box>
            </Box>
            <Box paddingBlockStart="400" />
            <Text variant="bodyMd" fontWeight="medium" paddingBlockEnd="200">
              Import Products by CSV
            </Text>
            <DropZone
              onDrop={handleDropZoneDrop}
              accept=".csv"
              type="file"
            >
              <DropZone.FileUpload actionTitle="Add files" actionHint="Accepts CSV" />
              {files.length > 0 && (
                <Box paddingBlockStart="200">
                  <Text variant="bodySm">{files.map(file => file.name).join(', ')}</Text>
                </Box>
              )}
            </DropZone>
            <Box paddingBlockStart="400" />
            <InlineStack align="end" gap="200" blockAlign="center">
              <Button onClick={() => setFiles([])} disabled={importLoading}>Cancel</Button>
              <Button variant="primary"  loading={importLoading} onClick={handleImportClick}>Start import</Button>
            </InlineStack>
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
    </Page>
  );
} 
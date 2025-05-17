import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
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
  InlineStack,
  Toast,
  Frame,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
  Badge
} from '@shopify/polaris';
import '../styles/globals.css';
import Footer from '../components/Footer';
import tutorialIcon from '../assets/tutorialIcon.png';
import { PlayIcon } from '@shopify/polaris-icons';
import { EmailIcon, ChatIcon, NoteIcon, CheckSmallIcon } from '@shopify/polaris-icons';
import amazonIcon from '../assets/source-icons/amazon.png';
import walmartIcon from '../assets/source-icons/walmart.png';
import ebayIcon from '../assets/source-icons/ebay.png';
import aliexpressIcon from '../assets/source-icons/aliexpres.png';
import woocommerceIcon from '../assets/source-icons/woo.png';
import wixIcon from '../assets/source-icons/wix.png';
import alibabaIcon from '../assets/source-icons/alibaba.png';
import etsyIcon from '../assets/source-icons/etsy.png';
import squarespaceIcon from '../assets/source-icons/squarespace.png';
import bigcommerceIcon from '../assets/source-icons/bigCommerce.png';
import shopifyIcon from '../assets/source-icons/shopify.png';
import csvIcon from '../assets/source-icons/csv.png';

const sourceOptions = [
  { label: 'Shopify', value: 'shopify' },
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

const sourceIcons = {
  shopify: shopifyIcon,
  amazon: amazonIcon,
  walmart: walmartIcon,
  ebay: ebayIcon,
  aliexpress: aliexpressIcon,
  woocommerce: woocommerceIcon,
  wix: wixIcon,
  alibaba: alibabaIcon,
  etsy: etsyIcon,
  squarespace: squarespaceIcon,
  bigcommerce: bigcommerceIcon,
  customcsv: csvIcon,
};

function SourceDropdown({ selectedSource, setSelectedSource }) {
  const [active, setActive] = useState(false);
  const toggleActive = useCallback(() => setActive((active) => !active), []);
  const options = [
    { label: 'Shopify', value: 'shopify' },
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
  const selected = options.find(opt => opt.value === selectedSource) || options[0];
  const activator = (
    <Button onClick={toggleActive} disclosure>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
        {sourceIcons[selected.value] ? (
          <img
            src={sourceIcons[selected.value]}
            alt={selected.label}
            style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain', marginRight: 8, background: '#fff' }}
          />
        ) : null}
        {selected.label}
      </span>
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
          content: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: selectedSource === opt.value ? 700 : 400 }}>
              {sourceIcons[opt.value] ? (
                <img
                  src={sourceIcons[opt.value]}
                  alt={opt.label}
                  style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain', marginRight: 8, background: '#fff' }}
                />
              ) : null}
              {opt.label}
            </span>
          ),
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

function ImportSkeleton() {
  return (
    <SkeletonPage>
      {/* Header Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="large" />
            <SkeletonBodyText lines={2} />
          </div>
        </Card>
      </Box>

      {/* Upload Section Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <div style={{ 
                border: '2px dashed #ddd',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center'
              }}>
                <SkeletonThumbnail size="large" />
                <Box paddingBlockStart="200">
                  <SkeletonBodyText lines={2} />
                </Box>
              </div>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Platform Selection Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <InlineGrid gap="400" columns={4}>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      <SkeletonThumbnail size="medium" />
                      <Box paddingBlockStart="200">
                        <SkeletonBodyText lines={1} />
                      </Box>
                    </div>
                  </Card>
                ))}
              </InlineGrid>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Recent Imports Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <BlockStack gap="200">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <div style={{ padding: '20px' }}>
                      <InlineStack gap="400" align="space-between">
                        <div style={{ flex: 1 }}>
                          <SkeletonBodyText lines={2} />
                        </div>
                        <SkeletonThumbnail size="small" />
                      </InlineStack>
                    </div>
                  </Card>
                ))}
              </BlockStack>
            </Box>
          </div>
        </Card>
      </Box>
    </SkeletonPage>
  );
}

export default function Import() {
  const navigate = useNavigate();
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
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const [shopDomain, setShopDomain] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get shop domain on component mount
  useEffect(() => {
    const getShopDomain = async () => {
      try {
        console.log('[Import] Fetching shop domain...');
        const response = await fetch('/api/shop', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log('[Import] Not authenticated, redirecting to auth...');
            // Redirect to auth if not authenticated
            const returnTo = `/app/import${window.location.search}`;
            window.location.href = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
            return;
          }
          throw new Error('Failed to get shop domain');
        }

        const data = await response.json();
        console.log('[Import] Shop API response:', data);

        if (data.success && data.shop) {
          console.log('[Import] Shop domain loaded:', data.shop);
          setShopDomain(data.shop);
        } else {
          console.error('[Import] No shop domain in response:', data);
          showErrorToast('Unable to get shop information. Please try again.');
        }
      } catch (error) {
        console.error('[Import] Error getting shop domain:', error);
        showErrorToast('Failed to load shop information. Please refresh the page.');
      }
    };

    getShopDomain();
  }, []);

  useEffect(() => {
    // Simulate loading
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleDropZoneDrop = useCallback((_dropFiles, acceptedFiles) => {
    console.log('[Import] Files dropped:', {
      count: acceptedFiles.length,
      files: acceptedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
    setFiles(acceptedFiles);
  }, []);

  const showSuccessToast = (message) => {
    setToastMessage(message);
    setToastError(false);
    setToastActive(true);
  };

  const showErrorToast = (message) => {
    setToastMessage(message);
    setToastError(true);
    setToastActive(true);
  };

  const handleImportClick = async () => {
    if (!shopDomain) {
      console.error('[Import] No shop domain available');
      showErrorToast('Please wait while we load your shop information...');
      return;
    }

    if (files.length === 0) {
      console.log('[Import] No files selected');
      showErrorToast('Please select a file to import');
      return;
    }

    console.log('[Import] Starting import process:', {
      fileName: files[0].name,
      fileSize: files[0].size,
      format: selectedSource.value,
      shop: shopDomain
    });

    setImportLoading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('csv', files[0]);
    formData.append('format', selectedSource.value);
    formData.append('shop', shopDomain);

    try {
      console.log('[Import] Sending request to /api/csv-upload');
      const response = await fetch('/api/csv-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      console.log('[Import] Received response:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Import] Error response:', errorData);

        if (response.status === 401) {
          console.log('[Import] Not authenticated, redirecting to auth...');
          const returnTo = `/app/import${window.location.search}`;
          window.location.href = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
          return;
        }

        if (response.status === 403) {
          if (errorData.upgradeUrl) {
            showErrorToast(errorData.error || 'Please upgrade your plan to continue importing');
            navigate('/app/billing');
            return;
          }
          showErrorToast(errorData.error || 'Import quota exceeded. Please upgrade your plan.');
          return;
        }

        throw new Error(errorData.error || 'Import request failed');
      }

      const result = await response.json();
      console.log('[Import] Response data:', result);

      if (result.success) {
        console.log('[Import] Import successful:', {
          successful: result.results.successful,
          failed: result.results.failed,
          skipped: result.results.skipped
        });
        showSuccessToast(`Successfully imported ${result.results.successful} products!`);
        setImportResult({
          success: true,
          message: `Imported ${result.results.successful} products!`,
          details: result.results
        });
      } else {
        console.error('[Import] Import failed:', result.error);
        showErrorToast(result.error || 'Import failed.');
        setImportResult({
          success: false,
          message: result.error || 'Import failed.',
          details: result.results
        });
      }
    } catch (error) {
      console.error('[Import] Error during import:', error);
      showErrorToast(error.message || 'Failed to import products. Please try again.');
      setImportResult({
        success: false,
        message: error.message || 'Failed to import products. Please try again.',
        error: error
      });
    } finally {
      console.log('[Import] Import process completed');
      setImportLoading(false);
    }
  };

  if (isLoading) {
    return <ImportSkeleton />;
  }

  return (
    <Frame>
      <Page>
        <Box paddingBlockStart="400" paddingBlockEnd="400" display="flex" justifyContent="center">
          <Card>
            <Box padding="600" minWidth="920px" maxWidth="700px">
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                {/* <Text variant="headingMd" as="h2" fontWeight="bold">
                  Import Product
                </Text> */}
                <Box width="100%" display="flex" flexDirection="column" alignItems="center">
                  <Text variant="bodyMd" as="div" fontWeight="medium" alignment="center" >
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
              <InlineStack align="fill" gap="200" blockAlign="center">
                {selectedSource.value === 'customcsv' ? (
                  <>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <a
                        href="/api/products/export?format=customcsv&type=sample"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'underline', color: '#3574F2' }}
                      >
                        Download sample CSV
                      </a>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
                      <Button onClick={() => setFiles([])} disabled={importLoading}>Cancel</Button>
                      <Button variant="primary" loading={importLoading} onClick={handleImportClick}>Start import</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
                      <Button onClick={() => setFiles([])} disabled={importLoading}>Cancel</Button>
                      <Button variant="primary" loading={importLoading} onClick={handleImportClick}>Start import</Button>
                    </div>
                  </>
                )}
              </InlineStack>
            </Box>
          </Card>
        </Box>


        {/* Tutorials */}
        <Box display="flex" justifyContent="flex-start" paddingBlockEnd="400">
          <Card padding="500" background="bg-surface" borderRadius="2xl" paddingBlockStart="600" paddingBlockEnd="600">
            <BlockStack gap="200">
              <Text variant="headingMd">Quick tutorials</Text>
              <Text color="subdued">This is where an optional subheading can go</Text>
              <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                {pagedTutorials.map((tut, idx) => (
                  <Card key={idx} padding="400">
                    <Box background="bg-surface">
                      <div style={{ display: 'flex', gap: 5 }}>
                        {/* Icon on the left */}
                        <Box
                          width="60px"
                          height="60px"
                          borderRadius="full"
                          background="#8B5CF6"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          marginInlineEnd="200"
                        >
                          <img src={tutorialIcon} alt="Tutorial" style={{ width: 40, height: 40 }} />
                        </Box>
                        {/* Content on the right */}
                        <BlockStack gap="100">
                          <Text variant="headingSm">{tut.title}</Text>
                          <Text>{tut.desc}</Text>
                          <ButtonGroup>
                            <Button url={tut.video} icon={PlayIcon}>Watch video</Button>
                            <Link url={tut.instruction} style={{ color: '#3574F2', fontWeight: 500 }}>
                              Read instruction
                            </Link>
                          </ButtonGroup>
                        </BlockStack>
                      </div>
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
        </Box>

        {/* Help Section */ /* FAQ Section */}
        <Box display="flex" justifyContent="flex-start" paddingBlockEnd="400">
          <Card paddingBlockStart="600" paddingBlockEnd="600" background="bg-surface" borderRadius="2xl">
            <div style={{ padding: '5px 0px 11px 2px' }}>
              <Text variant="headingMd" as="h2" fontWeight="bold">
                Need help or Import?
              </Text>
            </div>
            <InlineGrid columns={3} gap="400" style={{ width: '100%' }}>
              <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Icon source={EmailIcon} color="interactive" />
                      Get email support
                    </span>
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    Email us and we'll get back to you as soon as possible.
                  </Text>
                </Box>
              </Card>
              <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Icon source={ChatIcon} color="interactive" />
                      Start live chat
                    </span>
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    Talk to us directly via live chat to get help with your question.
                  </Text>
                </Box>
              </Card>
              <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Icon source={NoteIcon} color="interactive" />
                      Help docs
                    </span>
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    Find a solution for your problem with documents and tutorials.
                  </Text>
                </Box>
              </Card>
            </InlineGrid>
            <Box display="flex" justifyContent="flex-start" paddingBlockEnd="400">
              <Box display="flex" paddingBlockStart="400">
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
              </Box>
            </Box>
          </Card>
        </Box>

        
        {toastActive && (
          <Toast content={toastMessage} error={toastError} onDismiss={() => setToastActive(false)} />
        )}

        <Footer />
      </Page>
    </Frame>
  );
} 
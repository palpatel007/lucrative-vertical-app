import React, { useState, useCallback, Suspense, useEffect } from 'react';
import {
  Page,
  Card,
  MediaCard,
  Text,
  Button,
  Badge,
  Link,
  Collapsible,
  ButtonGroup,
  InlineStack,
  BlockStack,
  Box,
  Popover,
  ActionList,
  InlineGrid,
  Pagination,
  Icon,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
  SkeletonPage,
} from '@shopify/polaris';
import '../styles/globals.css';
import Footer from '../components/Footer';
import tutorialIcon from '../assets/tutorialIcon.png';
import downloadIcon from '../assets/download.png';
import codeIcon from '../assets/code.png';
import uploadIcon from '../assets/upload.png';
import { PlayIcon } from '@shopify/polaris-icons';
import { EmailIcon, ChatIcon, NoteIcon } from '@shopify/polaris-icons';
import userPng from '../assets/user.png';
import { ImportIcon, CheckSmallIcon, ExportIcon } from '@shopify/polaris-icons';
import { CalendarIcon } from '@shopify/polaris-icons';
import { json } from "@remix-run/node";
import { connectDatabase } from '../utils/database';
import { Shop } from '../models/Shop';
import { Subscription } from '../models/subscription';
import { authenticate } from "../shopify.server";
import { useLoaderData } from 'react-router-dom';
import CountryFlag from 'react-country-flag';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

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

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', country: 'US' },
  { code: 'ar', label: 'Arabic', country: 'SA' },
  { code: 'bg', label: 'Bulgarian', country: 'BG' },
  { code: 'zh', label: 'Chinese', country: 'CN' },
  { code: 'hr', label: 'Croatian', country: 'HR' },
  { code: 'cs', label: 'Czech', country: 'CZ' },
  { code: 'da', label: 'Danish', country: 'DK' },
  { code: 'nl', label: 'Dutch', country: 'NL' },
  { code: 'fi', label: 'Finnish', country: 'FI' },
  { code: 'fr', label: 'French', country: 'FR' },
  { code: 'de', label: 'German', country: 'DE' },
  { code: 'el', label: 'Greek', country: 'GR' },
  { code: 'he', label: 'Hebrew', country: 'IL' },
  { code: 'hi', label: 'Hindi', country: 'IN' },
  { code: 'hu', label: 'Hungarian', country: 'HU' },
  { code: 'id', label: 'Indonesian', country: 'ID' },
  { code: 'it', label: 'Italian', country: 'IT' },
  { code: 'ja', label: 'Japanese', country: 'JP' },
  { code: 'ko', label: 'Korean', country: 'KR' },
  { code: 'ms', label: 'Malay', country: 'MY' },
  { code: 'no', label: 'Norwegian', country: 'NO' },
  { code: 'pl', label: 'Polish', country: 'PL' },
  { code: 'pt', label: 'Portuguese', country: 'PT' },
  { code: 'ro', label: 'Romanian', country: 'RO' },
  { code: 'ru', label: 'Russian', country: 'RU' },
  { code: 'es', label: 'Spanish', country: 'ES' },
  { code: 'sv', label: 'Swedish', country: 'SE' },
  { code: 'th', label: 'Thai', country: 'TH' },
  { code: 'tr', label: 'Turkish', country: 'TR' },
  { code: 'uk', label: 'Ukrainian', country: 'UA' },
  { code: 'vi', label: 'Vietnamese', country: 'VN' },
  // Add more as needed
];

export async function loader({ request }) {
  await connectDatabase();

  // Authenticate the user/session
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const accessToken = session.accessToken;

  if (!shopDomain) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  // Upsert shop document
  let shop;
  try {
    shop = await Shop.findOne({ shop: shopDomain });
    if (!shop) {
      // Fetch required shop fields from Shopify
      const response = await admin.graphql(`{
        shop {
          name
          myshopifyDomain
          plan { displayName shopifyPlus }
        }
      }`);
      const shopData = await response.json();
      const info = shopData.data.shop;
      // Check all required fields
      if (!info.name || !info.myshopifyDomain || !info.plan?.displayName) {
        throw new Error('Missing required shop fields from Shopify API');
      }
      shop = await Shop.create({
        shop: shopDomain,
        name: info.name,
        myshopifyDomain: info.myshopifyDomain,
        plan: info.plan.displayName,
        isPlus: info.plan.shopifyPlus,
        accessToken: accessToken || "no access token",
        lastLogin: new Date()
      });
      console.log('[Dashboard] Shop document created:', shop);
    } else {
      shop.accessToken = accessToken;
      shop.lastLogin = new Date();
      await shop.save();
      console.log('[Dashboard] Shop document updated:', shop);
    }
  } catch (err) {
    console.error('[Dashboard] Failed to upsert shop:', err);
    return json({ error: "Failed to upsert shop" }, { status: 500 });
  }

  // Upsert subscription if not exists
  let subscription;
  try {
    subscription = await Subscription.findOne({ shopId: shop._id });
    if (!subscription) {
      subscription = await Subscription.create({
        shopId: shop._id,
        accessToken: shop.accessToken,
        plan: 'FREE',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      console.log('[Dashboard] Free subscription created:', subscription);
    } else {
      console.log('[Dashboard] Subscription already exists for shopId:', shop._id);
    }
  } catch (err) {
    console.error('[Dashboard] Failed to upsert subscription:', err);
    return json({ error: "Failed to upsert subscription" }, { status: 500 });
  }

  // Return shop domain and plan to client
  return json({ shop: shopDomain, plan: subscription.plan });
}

function DashboardSkeleton() {
  return (
    <SkeletonPage>
      {/* MediaCard Banner Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
            <SkeletonThumbnail size="large" />
            <div style={{ flex: 1 }}>
              <SkeletonDisplayText size="medium" />
              <SkeletonBodyText lines={3} />
            </div>
          </div>
        </Card>
      </Box>

      {/* Welcome Bar Skeleton */}
      <Box paddingBlockEnd="400">
        <InlineStack gap="400" align="space-between">
          <InlineStack gap="200">
            <SkeletonThumbnail size="small" />
            <SkeletonBodyText lines={1} />
          </InlineStack>
          <SkeletonThumbnail size="small" />
        </InlineStack>
      </Box>

      {/* Steps Section Skeleton */}
      <Box paddingBlockEnd="400">
        <InlineGrid gap="400" columns={3}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div style={{ padding: '20px' }}>
                <SkeletonThumbnail size="large" />
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={2} />
                <Box paddingBlockStart="200">
                  <SkeletonThumbnail size="small" />
                </Box>
              </div>
            </Card>
          ))}
        </InlineGrid>
      </Box>

      {/* Stats Section Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <InlineGrid gap="400" columns={4}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <SkeletonDisplayText size="small" />
                  <SkeletonBodyText lines={1} />
                </div>
              ))}
            </InlineGrid>
          </div>
        </Card>
      </Box>

      {/* Tutorials Section Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <SkeletonBodyText lines={1} />
            <Box paddingBlockStart="400">
              <InlineGrid gap="400" columns={2}>
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <div style={{ padding: '20px' }}>
                      <InlineStack gap="200">
                        <SkeletonThumbnail size="medium" />
                        <div style={{ flex: 1 }}>
                          <SkeletonDisplayText size="small" />
                          <SkeletonBodyText lines={2} />
                        </div>
                      </InlineStack>
                    </div>
                  </Card>
                ))}
              </InlineGrid>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Help Section Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <InlineGrid gap="400" columns={3}>
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <div style={{ padding: '20px' }}>
                      <InlineStack gap="200">
                        <SkeletonThumbnail size="small" />
                        <div style={{ flex: 1 }}>
                          <SkeletonBodyText lines={2} />
                        </div>
                      </InlineStack>
                    </div>
                  </Card>
                ))}
              </InlineGrid>
            </Box>
          </div>
        </Card>
      </Box>
    </SkeletonPage>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [tutorialPage, setTutorialPage] = useState(1);
  const [selectedRange, setSelectedRange] = useState('7');
  const [isLoading, setIsLoading] = useState(true);
  const TUTORIALS_PER_PAGE = 2;
  const totalPages = Math.ceil(tutorialData.length / TUTORIALS_PER_PAGE);
  const pagedTutorials = tutorialData.slice(
    (tutorialPage - 1) * TUTORIALS_PER_PAGE,
    tutorialPage * TUTORIALS_PER_PAGE
  );
  const loaderData = typeof useLoaderData === 'function' ? useLoaderData() : {};
  const [stats, setStats] = useState({ totalProduct: 0, import: 0, export: 0 });

  useEffect(() => {
    let shop = new URLSearchParams(window.location.search).get('shop');
    if (!shop && loaderData.shop) {
      shop = loaderData.shop;
    }
    if (shop) {
      setIsLoading(true);
      fetch(`/api/stats?shop=${encodeURIComponent(shop)}&range=${selectedRange}`)
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setIsLoading(false);
        });
    }
  }, [loaderData.shop, selectedRange]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // HelpSection logic moved here
  const faqs = [
    'Why does the option not appear on my product detail page?',
    'Why does the option not appear on my product detail page?',
    'Why does the option not appear on my product detail page?',
    'Why does the option not appear on my product detail page?',
    'Why does the option not appear on my product detail page?',
  ];

  // Utility function to format plan names
  function formatPlanName(plan) {
    if (!plan) return '';
    return plan
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return (
    <Box background="bg-surface-secondary" minHeight="100vh" paddingBlockStart="600" paddingBlockEnd="600">
      <Page>
        {/* MediaCard Banner with image filling the left side */}
        <MediaCard
          title={t('welcome')}
          primaryAction={{
            content: 'Validate product',
            onAction: () => { },
          }}
          secondaryAction={{
            content: 'Learn more',
            onAction: () => { },
          }}
          description="Samantha is the owner of 3 thriving Shopify stores. Start your product exploration by learning about how she finds products to sell."
          popoverActions={[{ content: 'Dismiss', onAction: () => { } }]}
          size="small"
        >
          <img
            alt="Profile"
            width="100%"
            height="100%"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            src={userPng}
          />
        </MediaCard>

        {/* Welcome Bar */}
        <Box paddingBlockEnd="200" paddingBlockStart="200">
          <InlineStack align="space-between" blockAlign="center" width="100%">
            <InlineStack gap="200" blockAlign="center">
              <span style={{ fontSize: 20 }}>👋</span>
              <Text as="span" fontWeight="bold" variant="bodyMd" color="default">
                Welcome to
              </Text>
              <Link url="#" monochrome={false} removeUnderline={false}>
                <Text as="span" fontWeight="semibold" variant="bodyMd" color="textHighlight">
                  SBit - Bulk Product Upload
                </Text>
              </Link>
              <Badge status={loaderData.plan === 'FREE' ? 'info' : 'success'} tone={loaderData.plan === 'FREE' ? 'info' : 'success'}>{loaderData.plan ? formatPlanName(loaderData.plan) : 'Free Plan'}</Badge>
            </InlineStack>
            <Box display="flex" alignItems="center" gap="200">
              <LanguageDropdown selectedLanguage={selectedLanguage} setSelectedLanguage={setSelectedLanguage} />
            </Box>
          </InlineStack>
        </Box>


        {/* Steps Section */}
        <Box display="flex" justifyContent="flex-start" paddingBlockEnd="400">
          <SpacingBackground>
            <InlineGrid gap="400" columns={3}>
              <Placeholder height="320px" width="307px">
                <img src={downloadIcon} alt="Export" style={{ width: 96, height: 120, objectFit: 'contain', borderRadius: 12, marginBottom: 16 }} />
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#202223', fontWeight: 450, fontSize: 12 }}>Step 1: </span>
                  <span role="img" aria-label="rocket">🚀</span>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>Export Your Bulk Product File</div>
                </div>
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <Text color="subdued" style={{ fontSize: 12, marginBottom: 16, display: 'inline-block' }}>
                    Download your product list (CSV) from any eCommerce platform like Shopify, WooCommerce, Magento, or BigCommerce.
                  </Text>
                </div>
                <Button variant="primary" fullWidth style={{ width: 288, height: 32 }}>Need Full Instructions</Button>
              </Placeholder>
              <Placeholder height="320px" width="307px">
                <img src={codeIcon} alt="Select Platform" style={{ width: 96, height: 120, objectFit: 'contain', borderRadius: 12, marginBottom: 16 }} />
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#202223', fontWeight: 450, fontSize: 12 }}>Step 2: </span>
                  <span role="img" aria-label="cart">🛒</span>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>Select Your Source Platform</div>
                </div>
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <Text color="subdued" style={{ fontSize: 12, marginBottom: 16, display: 'inline-block' }}>
                    Choose the platform from which your product file was exported. This helps us optimize the import settings automatically.
                  </Text>
                </div>
                <Button variant="primary" fullWidth style={{ width: 288, height: 32 }}>Select Platform</Button>
              </Placeholder>
              <Placeholder height="320px" width="100%">
                <img src={uploadIcon} alt="Upload" style={{ width: 96, height: 120, objectFit: 'contain', borderRadius: 12, marginBottom: 16 }} />
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#202223', fontWeight: 450, fontSize: 12 }}>Step 3: </span>
                  <span role="img" aria-label="ship">⛵</span>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>Upload Your Product File</div>
                </div>
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <Text color="subdued" style={{ fontSize: 12, marginBottom: 16, display: 'inline-block' }}>
                    Simply upload the exported file here. We'll process your products and prepare them for seamless migration into your Shopify store.
                  </Text>
                </div>
                <Button variant="primary" fullWidth style={{ width: 288, height: 32 }}>Upload File</Button>
              </Placeholder>
            </InlineGrid>
          </SpacingBackground>
        </Box>


        {/* Date Range Dropdown */}
        <Box display="flex" justifyContent="flex-start" paddingBlockEnd="400">
          <DateRangeDropdown selectedRange={selectedRange} setSelectedRange={setSelectedRange} />
        </Box>

        {/* Stats */}
        <Box display="flex" justifyContent="flex-start" paddingBlockEnd="400">
          <Card padding="500" background="bg-surface" borderRadius="2xl" flex="1" paddingBlockStart="600" paddingBlockEnd="600">
            <div style={{ width: '100%' }}>
              {/* Labels Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 48,
                marginBottom: 8,
              }}>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#202223' }}>Total Product</div>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#202223' }}>Import</div>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#202223' }}>Export</div>
              </div>
              {/* Numbers Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 48,
              }}>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 20, color: '#202223' }}>{stats.totalProduct}</div>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 20, color: '#202223' }}>{stats.import}</div>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 20, color: '#202223' }}>{stats.export}</div>
              </div>
            </div>
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
        <Footer />
      </Page>
    </Box>
  );
}

const SpacingBackground = ({
  children,
  width = '100%',
}) => {
  return (
    <div
      style={{
        width,
        height: 'auto',
      }}
    >
      {children}
    </div>
  );
};

const Placeholder = ({ height = 'auto', width = 'auto', children }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        height: height ?? undefined,
        width: width ?? undefined,
        borderRadius: 16,
        border: '1px solid #E3E3E3',
        gap: 5,
        padding: 24,
      }}
    >
      {children}
    </div>
  );
};

function LanguageDropdown({ selectedLanguage, setSelectedLanguage }) {
  const [active, setActive] = useState(false);
  const toggleActive = useCallback(() => setActive((active) => !active), []);
  const selected = LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage) || LANGUAGE_OPTIONS[0];

  const activator = (
    <Button onClick={toggleActive} disclosure>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
        <CountryFlag
          countryCode={selected.country}
          svg
          style={{ width: 22, height: 16, borderRadius: 3, marginRight: 10, boxShadow: '0 0 1px #ccc' }}
          aria-label={selected.label}
        />
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
      <div style={{ maxHeight: 320, overflowY: 'auto', minWidth: 200 }}>
        <ActionList
          actionRole="menuitem"
          items={LANGUAGE_OPTIONS.map(lang => ({
            active: selectedLanguage === lang.code,
            content: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: selectedLanguage === lang.code ? 700 : 400 }}>
                <CountryFlag
                  countryCode={lang.country}
                  svg
                  style={{ width: 22, height: 16, borderRadius: 3, marginRight: 10, boxShadow: '0 0 1px #ccc' }}
                  aria-label={lang.label}
                />
                {lang.label}
              </span>
            ),
            suffix: selectedLanguage === lang.code ? <Icon source={CheckSmallIcon} /> : undefined,
            onAction: () => {
              setSelectedLanguage(lang.code);
              setActive(false);
            }
          }))}
        />
      </div>
    </Popover>
  );
}

function DateRangeDropdown({ selectedRange, setSelectedRange }) {
  const [active, setActive] = useState(false);
  const toggleActive = useCallback(() => setActive((active) => !active), []);
  const ranges = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
  ];
  const activator = (
    <Button onClick={toggleActive} disclosure icon={CalendarIcon}>
      {ranges.find(r => r.value === selectedRange)?.label || 'Select range'}
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
        items={ranges.map(range => ({
          content: range.label,
          active: selectedRange === range.value,
          suffix: selectedRange === range.value ? <Icon source={CheckSmallIcon} /> : undefined,
          onAction: () => {
            setSelectedRange(range.value);
            setActive(false);
          },
        }))}
      />
    </Popover>
  );
}

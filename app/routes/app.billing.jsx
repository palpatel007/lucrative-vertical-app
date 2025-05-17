import {
  Page,
  Card,
  Text,
  Button,
  Badge,
  Link,
  InlineStack,
  BlockStack,
  Box,
  InlineGrid,
  Icon,
  Toast,
  Spinner,
  Frame,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
} from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useEffect } from 'react';
import { useSubmit, useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { redirect, json } from '@remix-run/node';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { Subscription } from '../models/subscription.js';

import frame1 from '../assets/Frame (1).png';
import frame2 from '../assets/Frame (2).png';
import frame3 from '../assets/Frame (3).png';
import frame4 from '../assets/Frame (4).png';
import group4 from '../assets/Group (4).png';
import free from '../assets/Frame.png';
import tutorialIcon from '../assets/tutorialIcon.png';
import Footer from '../components/Footer';

export const loader = async ({ request }) => {
  // Authenticate the user/session (same as dashboard)
  const { session } = await authenticate.admin(request);
  console.log('[Billing Loader] Session:', session);
  const shopDomain = session.shop;
  const accessToken = session.accessToken;

  if (!shopDomain) {
    console.warn('[Billing Loader] No valid session found. Redirecting to login page.', { session });
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  console.log('[Billing Loader] Request headers:', request.headers);
  console.log('[Billing Loader] Session:', session);
  console.log('[Billing Loader] Cookies:', request.headers.get('cookie'));
  try {
    console.log('[Billing Loader] Starting billing loader');
    const { session: sessionFromAuth } = await authenticate.admin(request);
    console.log('[Billing Loader] Session details:', {
      shop: session?.shop,
      hasAccessToken: !!session?.accessToken,
      isActive: !!session?.isActive
    });

    if (!session || !session.shop) {
      const url = new URL(request.url);
      const shop = url.searchParams.get('shop');
      const chargeId = url.searchParams.get('charge_id');
      const plan = url.searchParams.get('plan');
      if (shop && chargeId && plan) {
        return redirect(`/auth?shop=${shop}&returnTo=/app/dashboard`);
      }
      if (shop) {
        return redirect(`/auth?shop=${shop}`);
      }
      return redirect('/auth/login');
    }

    const shop = session.shop;
    const url = new URL(request.url);
    const chargeId = url.searchParams.get('charge_id');
    const planName = url.searchParams.get('plan');
    const shopName = url.searchParams.get('shop');

    try {
      if (chargeId && planName && shopName) {
        console.log('[Billing Loader] session.shop:', session.shop, 'session.accessToken:', session.accessToken);
        // Fetch charge status from Shopify
        const response = await fetch(
          `https://${session.shop}/admin/api/2024-01/recurring_application_charges/${chargeId}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': session.accessToken,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Billing Loader] Shopify API error:', response.status, errorText);
          throw new Error('Failed to fetch charge from Shopify');
        }
        const data = await response.json();
        const charge = data.recurring_application_charge;

        if (charge && charge.status === 'active') {
          const shopRecord = await Shop.findOne({ shop: session.shop });
          if (!shopRecord) throw new Error('Shop not found');

          await Subscription.findOneAndUpdate(
            { shopId: shopRecord._id }, 
            { plan: planName, status: 'active' }
          );
          return json({ redirectToDashboard: true });
        }
      }
    } catch (err) {
      console.error('[Billing Loader] Charge check error:', err);
      throw err;
    }

    // Get the current URL to construct the proper API URL
    const baseUrl = `${url.protocol}//${url.host}`;
    console.log('[Billing Loader] Base URL:', baseUrl);

    // Fetch current subscription and plans with proper headers
    console.log('[Billing Loader] Fetching billing data for shop:', shop);
    const response = await fetch(`${baseUrl}/api/billing?shop=${shop}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
        'X-Shopify-Access-Token': session.accessToken,
        'X-Shopify-Shop-Domain': shop
      },
      credentials: 'include' // Include cookies in the request
    });

    console.log('[Billing Loader] Billing API response status:', response.status);

    if (!response.ok) {
      console.error('[Billing Loader] Failed to fetch billing data:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Handle specific error cases
      if (response.status === 410) {
        // Session expired - try to refresh the session
        console.log('[Billing Loader] Session expired, attempting to refresh');
        const refreshResponse = await fetch(`${baseUrl}/auth/refresh?shop=${shop}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`
          },
          credentials: 'include'
        });

        console.log('[Billing Loader] Session refresh response:', {
          status: refreshResponse.status,
          ok: refreshResponse.ok
        });

        if (refreshResponse.ok) {
          // Retry the billing request after refresh
          console.log('[Billing Loader] Retrying billing request after refresh');
          const retryResponse = await fetch(`${baseUrl}/api/billing?shop=${shop}`, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${session.accessToken}`
            },
            credentials: 'include'
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            console.log('[Billing Loader] Successfully fetched billing data after refresh');
            return {
              subscription: data.subscription,
              plans: data.plans,
              session: {
                shop: session.shop,
                accessToken: session.accessToken
              }
            };
          }
        }

        // If refresh failed, redirect to auth
        console.log('[Billing Loader] Session refresh failed, redirecting to auth');
        return redirect('/auth');
      }

      if (response.status === 401 || response.status === 403) {
        // Authentication issues - redirect to auth
        console.log('[Billing Loader] Authentication failed, redirecting to auth');
        return redirect('/auth');
      }

      // For other errors, throw to be caught by the catch block
      throw new Error(`Failed to fetch billing data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Billing Loader] Successfully fetched billing data:', {
      hasSubscription: !!data.subscription,
      plansCount: data.plans?.length,
      subscriptionPlan: data.subscription?.plan,
      subscriptionStatus: data.subscription?.status
    });

    if (!data || !data.plans || !Array.isArray(data.plans)) {
      console.error('[Billing Loader] Invalid response data:', data);
      throw new Error('Invalid billing data received');
    }

    return {
      subscription: data.subscription,
      plans: data.plans,
      session: {
        shop: session.shop,
        accessToken: session.accessToken
      }
    };
  } catch (error) {
    console.error('[Billing Loader] Error:', {
      message: error.message,
      stack: error.stack
    });
    // Only redirect to auth if it's a session-related error
    if (error.message.includes('session') || error.message.includes('auth')) {
      return redirect('/auth');
    }
    throw error;
  }
};

function BillingSkeleton() {
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

      {/* Current Plan Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <InlineStack gap="400" align="space-between">
                <div style={{ flex: 1 }}>
                  <SkeletonBodyText lines={2} />
                </div>
                <SkeletonThumbnail size="small" />
              </InlineStack>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Plan Features Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <BlockStack gap="200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <InlineStack key={i} gap="200" align="start">
                    <SkeletonThumbnail size="small" />
                    <SkeletonBodyText lines={1} />
                  </InlineStack>
                ))}
              </BlockStack>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Upgrade Options Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <InlineGrid gap="400" columns={3}>
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <div style={{ padding: '20px' }}>
                      <SkeletonDisplayText size="small" />
                      <SkeletonBodyText lines={3} />
                      <Box paddingBlockStart="200">
                        <SkeletonThumbnail size="small" />
                      </Box>
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

export default function BillingPage() {
  const { subscription, plans, session, redirectToDashboard } = useLoaderData();
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const submit = useSubmit();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shop = searchParams.get('shop');
  const plan = searchParams.get('plan');
  const chargeId = searchParams.get('charge_id');
  const [isLoading, setIsLoading] = useState(true);
  const app = useAppBridge();
  const [cookieWarning, setCookieWarning] = useState(false);

  useEffect(() => {
    function isEmbedded() {
      try {
        return window.top !== window.self;
      } catch (e) {
        return true;
      }
    }
    if (!isEmbedded() && shop) {
      window.location.href = `/app/force-redirect?shop=${shop}`;
      return;
    }
    if (shop) {
      const appHandle = shop;
      const redirect = Redirect.create(app);
      redirect.dispatch(
        Redirect.Action.REMOTE,
        `https://${shop}/admin/apps/${appHandle}`
      );
    }
  }, [app, shop]);

  const handleUpgrade = async (planName) => {
    try {
      setLoadingPlan(planName);
      const formData = new FormData();
      formData.append('plan', planName);
      formData.append('shop', session.shop);

      const response = await fetch('/api/billing', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to process upgrade');
      }

      if (!data.confirmationUrl) {
        throw new Error('No confirmation URL received from server');
      }

      // Debug logs for App Bridge redirect issue
      function isEmbedded() {
        try {
          return window.top !== window.self;
        } catch (e) {
          return true;
        }
      }
      console.log('isEmbedded:', isEmbedded());
      console.log('app:', app);
      const redirect = Redirect.create(app);
      console.log('redirect:', redirect);
      console.log('redirect.dispatch:', redirect && redirect.dispatch);

      // Redirect user to Shopify's confirmationUrl for approval
      window.top.location.href = data.confirmationUrl;
    } catch (error) {
      setToastMessage('Failed to process upgrade. ' + (error.message || 'Please try again.'));
      setToastActive(true);
      setLoadingPlan(null);
    }
  };

  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

  const showSuccessToast = (message) => {
    setToastMessage(message);
    setToastActive(true);
  };

  const plansList = [
    {
      name: 'FREE',
      price: '$0',
      period: '/mo',
      features: [
        '20 Products Import & Export',
        'Shopify, WooCommerce',
        "Doesn't renew",
      ],
      button: <Button fullWidth disabled>Current Plan</Button>,
    },
    {
      name: 'SHOP PLAN',
      price: '$9.99',
      period: '/mo',
      features: [
        '100 Products Import & Export',
        'Shopify, WooCommerce, Wix, BigCommerce, Squarespace',
        'Renews monthly',
      ],
      button: <Button
        fullWidth
        variant='primary'
        onClick={() => handleUpgrade('SHOP PLAN')}
        disabled={subscription?.plan === 'SHOP PLAN' || loadingPlan === 'SHOP PLAN'}
      >
        {loadingPlan === 'SHOP PLAN' ? (
          <InlineStack gap="200" align="center">
            <Spinner size="small" />
            <span>Upgrading...</span>
          </InlineStack>
        ) : subscription?.plan === 'SHOP PLAN' ? 'Current Plan' : 'Upgrade'}
      </Button>,
    },
    {
      name: 'WAREHOUSE PLAN',
      price: '$14.99',
      period: '/mo',
      features: [
        '300 Products Import & Export',
        'Shopify, WooCommerce, Squarespace, Amazon, Alibaba, Custom Sheet',
        'Renews monthly',
      ],
      button: <Button
        fullWidth
        variant='primary'
        onClick={() => handleUpgrade('WAREHOUSE PLAN')}
        disabled={subscription?.plan === 'WAREHOUSE PLAN' || loadingPlan === 'WAREHOUSE PLAN'}
      >
        {loadingPlan === 'WAREHOUSE PLAN' ? (
          <InlineStack gap="200" align="center">
            <Spinner size="small" />
            <span>Upgrading...</span>
          </InlineStack>
        ) : subscription?.plan === 'WAREHOUSE PLAN' ? 'Current Plan' : 'Upgrade'}
      </Button>,
    },
    {
      name: 'FACTORY PLAN',
      price: '$49.99',
      period: '/mo',
      features: [
        '1,000 Products Import & Export',
        'Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy',
        'Renews monthly',
        'Priority support',
      ],
      button: <Button
        fullWidth
        variant='primary'
        onClick={() => handleUpgrade('FACTORY PLAN')}
        disabled={subscription?.plan === 'FACTORY PLAN' || loadingPlan === 'FACTORY PLAN'}
      >
        {loadingPlan === 'FACTORY PLAN' ? (
          <InlineStack gap="200" align="center">
            <Spinner size="small" />
            <span>Upgrading...</span>
          </InlineStack>
        ) : subscription?.plan === 'FACTORY PLAN' ? 'Current Plan' : 'Upgrade'}
      </Button>,
    },
    {
      name: 'FRANCHISE PLAN',
      price: '$129.99',
      period: '/mo',
      features: [
        '3,000 Products Import & Export',
        'Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy, Ebay',
        'Renews monthly',
        'Priority support',
      ],
      button: <Button
        fullWidth
        variant='primary'
        onClick={() => handleUpgrade('FRANCHISE PLAN')}
        disabled={subscription?.plan === 'FRANCHISE PLAN' || loadingPlan === 'FRANCHISE PLAN'}
      >
        {loadingPlan === 'FRANCHISE PLAN' ? (
          <InlineStack gap="200" align="center">
            <Spinner size="small" />
            <span>Upgrading...</span>
          </InlineStack>
        ) : subscription?.plan === 'FRANCHISE PLAN' ? 'Current Plan' : 'Upgrade'}
      </Button>,
    },
    {
      name: 'CITADEL PLAN',
      price: '$499.99',
      period: '/mo',
      features: [
        '50,000 Products Import & Export',
        'Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy, Ebay',
        'Renews monthly',
        'Priority support',
      ],
      button: <Button fullWidth disabled>Contact us to upgrade</Button>,
    },
  ];

  useEffect(() => {
    // Simulate loading
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (chargeId && plan && shop) {
      // Optionally, check subscription?.status === 'active' before navigating
      navigate('/app/billing', { replace: true });
    }
  }, [chargeId, plan, shop, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    if (returnTo && subscription?.status === 'active') {
      navigate(returnTo, { replace: true });
    }
  }, [subscription, navigate]);

  useEffect(() => {
    if (redirectToDashboard && shop) {
      const appHandle = session.shop; // TODO: Set your app's handle here
      const redirect = Redirect.create(app);
      redirect.dispatch(
        Redirect.Action.REMOTE,
        `https://${shop}/admin/apps/${appHandle}`
      );
    }
  }, [redirectToDashboard, app, shop]);

  useEffect(() => {
    // Check if cookies are enabled and session cookie is present
    if (!document.cookie || document.cookie === '') {
      setCookieWarning(true);
    }
  }, []);

  if (isLoading) {
    return <BillingSkeleton />;
  }

  return (
    <Frame>
      <Page>
        <Box paddingBlockStart="400">
          <Box paddingBlockEnd="400">
            <Text variant="headingLg" as="h2" fontWeight="bold" alignment="left" marginBlockEnd="400">
              Pricing Plans
            </Text>
          </Box>
          <InlineGrid columns={3} rows={2} gap="400">
            {plansList.map((plan, idx) => (
              <Card key={idx} padding="400" background="bg-surface" borderRadius="2xl" style={{ minWidth: 300, maxWidth: 340, flex: 1 }}>
                <BlockStack gap="200" align="center">
                  <img
                    src={
                      idx === 0 ? free :
                        idx === 1 ? frame1 :
                          idx === 2 ? group4 :
                            idx === 3 ? frame2 :
                              idx === 4 ? frame3 :
                                idx === 5 ? frame4 :
                                  tutorialIcon
                    }
                    alt={plan.name}
                    style={{ display: 'block', width: 48, height: 48, margin: '0 auto', marginBottom: 12 }}
                  />
                  {plan.badge && <Box marginBlockEnd="200">{plan.badge}</Box>}
                  <Box>
                    <Text variant="headingMd" fontWeight="bold" alignment="center">{plan.name}</Text>
                    <Text variant="headingLg" fontWeight="bold" alignment="center">{plan.price}<span style={{ fontWeight: 400, fontSize: 18 }}>{plan.period}</span></Text>
                  </Box>
                  {plan.button}
                  <ul style={{ marginTop: 16, textAlign: 'left', paddingLeft: 0, listStyle: 'none' }}>
                    {plan.features.map((feature, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 15,
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <Icon source={CheckCircleIcon} tone="success" />
                        <span style={{ wordBreak: 'break-word', whiteSpace: 'normal', flex: 1 }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </Box>
        <Footer />
      </Page>
      {toastActive && (
        <Toast content={toastMessage} onDismiss={toggleToast} />
      )}
      {cookieWarning && (
        <Box padding="400" background="bg-warning-subdued">
          <Text color="critical">
            Warning: Cookies are disabled or blocked. Please enable third-party cookies in your browser and ensure you are not using a tunnel that blocks cookies (like some Cloudflare/ngrok setups). Shopify embedded apps require cookies to work correctly.
          </Text>
        </Box>
      )}
    </Frame>
  );
}
import {
  Page,
  Card,
  Text,
  Button,
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
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

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
  const shopDomain = session.shop;
  const accessToken = session.accessToken;

  if (!shopDomain) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    const { session: sessionFromAuth } = await authenticate.admin(request);

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
      throw err;
    }

    // Get the current URL to construct the proper API URL
    const baseUrl = `${url.protocol}//${url.host}`;

    // Fetch current subscription and plans with proper headers
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

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 410) {
        // Session expired - try to refresh the session
        const refreshResponse = await fetch(`${baseUrl}/auth/refresh?shop=${shop}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`
          },
          credentials: 'include'
        });

        if (refreshResponse.ok) {
          // Retry the billing request after refresh
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
        return redirect('/auth');
      }

      if (response.status === 401 || response.status === 403) {
        // Authentication issues - redirect to auth
        return redirect('/auth');
      }

      // For other errors, throw to be caught by the catch block
      throw new Error(`Failed to fetch billing data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data.plans || !Array.isArray(data.plans)) {
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
  const { t } = useTranslation();
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
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');

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
      name: t('billing.free'),
      price: '$0',
      period: '/mo',
      features: [
        t('billing.import_export_20'),
        t('billing.platforms_shop'),
        t('billing.does_not_renew'),
      ],
      button: <Button fullWidth disabled>{t('billing.current_plan')}</Button>,
    },
    {
      name: t('billing.shop_plan'),
      price: '$9.99',
      period: '/mo',
      features: [
        t('billing.import_export_100'),
        t('billing.platforms_shop_plus'),
        t('billing.renews_monthly'),
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
            <span>{t('billing.upgrading')}</span>
          </InlineStack>
        ) : subscription?.plan === 'SHOP PLAN' ? t('billing.current_plan') : t('billing.upgrade')}
      </Button>,
    },
    {
      name: t('billing.warehouse_plan'),
      price: '$14.99',
      period: '/mo',
      features: [
        t('billing.import_export_300'),
        t('billing.platforms_warehouse'),
        t('billing.renews_monthly'),
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
            <span>{t('billing.upgrading')}</span>
          </InlineStack>
        ) : subscription?.plan === 'WAREHOUSE PLAN' ? t('billing.current_plan') : t('billing.upgrade')}
      </Button>,
    },
    {
      name: t('billing.factory_plan'),
      price: '$49.99',
      period: '/mo',
      features: [
        t('billing.import_export_1000'),
        t('billing.platforms_factory'),
        t('billing.renews_monthly'),
        t('billing.priority_support'),
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
            <span>{t('billing.upgrading')}</span>
          </InlineStack>
        ) : subscription?.plan === 'FACTORY PLAN' ? t('billing.current_plan') : t('billing.upgrade')}
      </Button>,
    },
    {
      name: t('billing.franchise_plan'),
      price: '$129.99',
      period: '/mo',
      features: [
        t('billing.import_export_3000'),
        t('billing.platforms_franchise'),
        t('billing.renews_monthly'),
        t('billing.priority_support'),
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
            <span>{t('billing.upgrading')}</span>
          </InlineStack>
        ) : subscription?.plan === 'FRANCHISE PLAN' ? t('billing.current_plan') : t('billing.upgrade')}
      </Button>,
    },
    {
      name: t('billing.citadel_plan'),
      price: '$499.99',
      period: '/mo',
      features: [
        t('billing.import_export_50000'),
        t('billing.platforms_citadel'),
        t('billing.renews_monthly'),
        t('billing.priority_support'),
      ],
      button: <Button fullWidth disabled>{t('billing.contact_us_to_upgrade')}</Button>,
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
    if (redirectToDashboard && shop && app) {
      try {
        const appHandle = session.shop;
        const redirect = Redirect.create(app);
        if (redirect && typeof redirect.dispatch === 'function') {
          redirect.dispatch(
            Redirect.Action.REMOTE,
            `https://${shop}/admin/apps/${appHandle}`
          );
        } else {
          console.error('Redirect object or dispatch function is not valid:', redirect);
        }
      } catch (err) {
        console.error('App Bridge redirect error:', err);
      }
    }
  }, [redirectToDashboard, app, shop]);

  useEffect(() => {
    // Check if cookies are enabled and session cookie is present
    if (!document.cookie || document.cookie === '') {
      setCookieWarning(true);
    }
  }, []);



  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Polaris:wght@400;500;600;700&display=swap');
        .billing-features, .billing-card, .billing-features *, .billing-card * {
          font-family: 'Polaris', 'Inter', -apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif !important;
          font-size: 14px !important;
        }
      `}</style>
      <Frame>
        <Page>
          <Box paddingBlockStart="400">
            <Box paddingBlockEnd="400">
              <Text variant="headingLg" as="h2" fontWeight="bold" alignment="left" marginBlockEnd="400">
                {t('billing.title')}
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
                            display: 'flex',
                            alignItems: 'flex-start',
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon source={CheckCircleIcon} tone="success" />
                          </span>
                          <Text
                            as="span"
                            variant="bodyMd"
                            style={{
                              fontSize: 14,
                              wordBreak: 'break-word',
                              marginLeft: 8,
                            }}
                          >
                            {feature}
                          </Text>
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
        {/* {cookieWarning && (
          <Box padding="400" background="bg-warning-subdued">
            <Text color="critical">
              {t('billing.cookie_warning')}
            </Text>
          </Box>
        )} */}
      </Frame>
    </>
  );
}
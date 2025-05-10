import {
  Page,
  Card,
  Text,
  Button,
  Badge,
  BlockStack,
  InlineStack,
  Box,
  InlineGrid,
  Icon,
  Toast,
} from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import { useState, useCallback } from 'react';
import { useSubmit, useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { redirect } from '@remix-run/node';

import frame1 from '../assets/Frame (1).png';
import frame2 from '../assets/Frame (2).png';
import frame3 from '../assets/Frame (3).png';
import frame4 from '../assets/Frame (4).png';
import group4 from '../assets/Group (4).png';
import free from '../assets/Frame.png';
import tutorialIcon from '../assets/tutorialIcon.png';

export const loader = async ({ request }) => {
  try {
    console.log('[Billing Loader] Starting billing loader');
    const { session } = await authenticate.admin(request);
    console.log('[Billing Loader] Session details:', {
      shop: session?.shop,
      hasAccessToken: !!session?.accessToken,
      isActive: !!session?.isActive
    });

    if (!session || !session.shop) {
      console.log('[Billing Loader] No valid session, redirecting to auth');
      return redirect('/auth');
    }

    const shop = session.shop;

    // Get the current URL to construct the proper API URL
    const url = new URL(request.url);
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
            return { subscription: data.subscription, plans: data.plans };
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
    
    return { subscription: data.subscription, plans: data.plans };
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

export default function BillingPage() {
  const { subscription, plans } = useLoaderData();
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const submit = useSubmit();

  const handleUpgrade = useCallback(async (plan) => {
    try {
        const formData = new FormData();
        formData.append('plan', plan);
        
        submit(formData, { method: 'post', action: '/api/billing' });
    } catch (error) {
        console.error('Error upgrading plan:', error);
        setToastMessage('Failed to upgrade plan. Please try again.');
        setToastActive(true);
    }
  }, [submit]);

  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

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
        disabled={subscription?.plan === 'SHOP PLAN'}
      >
        {subscription?.plan === 'SHOP PLAN' ? 'Current Plan' : 'Upgrade'}
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
        disabled={subscription?.plan === 'WAREHOUSE PLAN'}
      >
        {subscription?.plan === 'WAREHOUSE PLAN' ? 'Current Plan' : 'Upgrade'}
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
        disabled={subscription?.plan === 'FACTORY PLAN'}
      >
        {subscription?.plan === 'FACTORY PLAN' ? 'Current Plan' : 'Upgrade'}
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
        disabled={subscription?.plan === 'FRANCHISE PLAN'}
      >
        {subscription?.plan === 'FRANCHISE PLAN' ? 'Current Plan' : 'Upgrade'}
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

  return (
    <div className="billing-page">
    <Page>
      <Box paddingBlockStart="400" paddingBlockEnd="400">
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
                  <div style={{ textAlign: 'center' }}>
                    <Text variant="headingMd" fontWeight="bold">{plan.name}</Text>
                    <Text variant="headingLg" fontWeight="bold">{plan.price}<span style={{ fontWeight: 400, fontSize: 18 }}>{plan.period}</span></Text>
                  </div>
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
                        <Icon source={CheckCircleIcon} color="success" />
                        <span style={{ wordBreak: 'break-word', whiteSpace: 'normal', flex: 1 }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </BlockStack>
              </Card>
            ))}
        </InlineGrid>
      </Box>
    </Page>
      {toastActive && (
        <Toast content={toastMessage} onDismiss={toggleToast} />
      )}
    </div>
  );
}
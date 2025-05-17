import { json, redirect } from '@remix-run/node';
import { authenticate } from '../../shopify.server.js';
import { Subscription } from '../../models/subscription.js';
import { Shop } from '../../models/Shop.js';
import { connectDatabase } from '../../utils/database.js';
import { Page, Card, Text, BlockStack, Button, Spinner } from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';

export const loader = async ({ request }) => {
    try {
        console.log('[Billing Confirm] Loader called. Request URL:', request.url);
        console.log('[Billing Confirm] Request headers:', Object.fromEntries(request.headers.entries()));
        const { session } = await authenticate.admin(request);
        console.log('[Billing Confirm] Session:', session);
        
        if (!session) {
            console.warn('[Billing Confirm] No valid session found. Redirecting to /auth.', { session });
            return redirect('/auth');
        }

        // Get shop and plan from URL
        const url = new URL(request.url);
        const shopName = url.searchParams.get('shop');
        const planName = url.searchParams.get('plan');
        const chargeId = url.searchParams.get('charge_id');

        if (!shopName || !planName || !chargeId) {
            console.error('[Billing Confirm] Missing required parameters:', { shopName, planName, chargeId });
            return json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Connect to database
        await connectDatabase();

        // Find shop
        const shop = await Shop.findOne({ shop: shopName });
        if (!shop) {
            console.error('[Billing Confirm] Shop not found:', shopName);
            return json({ error: 'Shop not found' }, { status: 404 });
        }

        // Verify the charge with Shopify
        const response = await fetch(`https://${session.shop}/admin/api/2024-01/recurring_application_charges/${chargeId}.json`, {
            headers: {
                'X-Shopify-Access-Token': session.accessToken,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        
        if (!response.ok || !data.recurring_application_charge) {
            console.error('[Billing Confirm] Failed to verify charge:', data);
            return json({ error: 'Failed to verify charge' }, { status: 500 });
        }

        const charge = data.recurring_application_charge;

        // Update subscription status
        await Subscription.findOneAndUpdate(
            { shopId: shop._id },
            {
                status: charge.status === 'active' ? 'active' : 'pending',
                plan: planName,
                shopifyChargeId: charge.id,
                nextBillingDate: new Date(charge.next_billing_date),
                test: charge.test
            },
            { upsert: true }
        );

        console.log('[Billing Confirm] Subscription updated successfully:', {
            shop: shopName,
            plan: planName,
            status: charge.status
        });

        return json({
            success: true,
            status: charge.status,
            plan: planName
        });
    } catch (error) {
        console.error('[Billing Confirm] Error:', {
            message: error.message,
            stack: error.stack
        });
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

export default function BillingConfirm() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);

    useEffect(() => {
        const verifySubscription = async () => {
            try {
                const response = await fetch(window.location.href);
                const data = await response.json();

                if (data.error) {
                    setError(data.error);
                    setStatus('error');
                } else if (data.success) {
                    setStatus(data.status);
                }
            } catch (err) {
                setError('Failed to verify subscription');
                setStatus('error');
            }
        };

        verifySubscription();
    }, []);

    const handleContinue = () => {
        navigate('/app');
    };

    if (status === 'loading') {
        return (
            <Page>
                <Card>
                    <BlockStack gap="400" alignment="center" padding="400">
                        <Spinner size="large" />
                        <Text variant="headingMd" as="h2">Verifying your subscription...</Text>
                    </BlockStack>
                </Card>
            </Page>
        );
    }

    if (status === 'error' || error) {
        return (
            <Page>
                <Card>
                    <BlockStack gap="400" alignment="center" padding="400">
                        <Text variant="headingMd" as="h2" color="critical">Subscription Error</Text>
                        <Text as="p">{error || 'There was an error processing your subscription.'}</Text>
                        <Button primary onClick={handleContinue}>Return to App</Button>
                    </BlockStack>
                </Card>
            </Page>
        );
    }

    return (
        <Page>
            <Card>
                <BlockStack gap="400" alignment="center" padding="400">
                    <Text variant="headingMd" as="h2">Subscription Confirmed!</Text>
                    <Text as="p">Your subscription has been successfully activated.</Text>
                    <Button primary onClick={handleContinue}>Continue to App</Button>
                </BlockStack>
            </Card>
        </Page>
    );
} 
import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';
import { Subscription } from '../models/subscription.js';
import { PLANS } from '../config/plans.js';
import { connectDatabase } from '../utils/database.js';

export const loader = async ({ request }) => {
    try {
        console.log('[Billing API] Starting billing API request');
        
        // Ensure database connection
        try {
            await connectDatabase();
            console.log('[Billing API] Database connected successfully');
        } catch (dbError) {
            console.error('[Billing API] Database connection error:', {
                message: dbError.message,
                stack: dbError.stack
            });
            return json({ error: 'Database connection failed' }, { status: 500 });
        }

        // Get shop from query params
        const url = new URL(request.url);
        const shop = url.searchParams.get('shop');
        
        if (!shop) {
            console.error('[Billing API] No shop parameter provided');
            return json({ error: 'Shop parameter is required' }, { status: 400 });
        }

        // Get access token from headers
        const accessToken = request.headers.get('X-Shopify-Access-Token');
        if (!accessToken) {
            console.error('[Billing API] No access token provided');
            return json({ error: 'Access token is required' }, { status: 401 });
        }

        console.log('[Billing API] Processing request for shop:', shop);

        // Get current subscription
        let subscription;
        try {
            subscription = await Subscription.findOne({ shopId: shop });
            console.log('[Billing API] Found subscription:', {
                exists: !!subscription,
                status: subscription?.status,
                plan: subscription?.plan
            });
        } catch (dbError) {
            console.error('[Billing API] Error fetching subscription:', {
                message: dbError.message,
                stack: dbError.stack
            });
            return json({ error: 'Failed to fetch subscription' }, { status: 500 });
        }
        
        // If no subscription exists, create a new FREE subscription
        if (!subscription) {
            try {
                console.log('[Billing API] Creating new FREE subscription for shop:', shop);
                subscription = await Subscription.create({
                    shopId: shop,
                    accessToken: accessToken,
                    plan: 'FREE',
                    status: 'active',
                    importCount: 0,
                    exportCount: 0,
                    allowedPlatforms: PLANS['FREE'].platforms
                });
                console.log('[Billing API] Successfully created FREE subscription');
            } catch (createError) {
                console.error('[Billing API] Error creating subscription:', {
                    message: createError.message,
                    stack: createError.stack
                });
                return json({ error: 'Failed to create subscription' }, { status: 500 });
            }
        }

        // Validate subscription plan exists
        if (!PLANS[subscription.plan]) {
            console.error('[Billing API] Invalid subscription plan:', subscription.plan);
            return json({ error: 'Invalid subscription plan' }, { status: 500 });
        }

        // Define available plans
        const plans = [
            {
                name: 'FREE',
                price: 0,
                features: [
                    '20 Products Import & Export',
                    'Shopify, WooCommerce',
                    "Doesn't renew",
                ]
            },
            {
                name: 'SHOP PLAN',
                price: 9.99,
                features: [
                    '100 Products Import & Export',
                    'Shopify, WooCommerce, Wix, BigCommerce, Squarespace',
                    'Renews monthly',
                ]
            },
            {
                name: 'WAREHOUSE PLAN',
                price: 14.99,
                features: [
                    '300 Products Import & Export',
                    'Shopify, WooCommerce, Squarespace, Amazon, Alibaba, Custom Sheet',
                    'Renews monthly',
                ]
            },
            {
                name: 'FACTORY PLAN',
                price: 49.99,
                features: [
                    '1,000 Products Import & Export',
                    'Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy',
                    'Renews monthly',
                    'Priority support',
                ]
            },
            {
                name: 'FRANCHISE PLAN',
                price: 129.99,
                features: [
                    '3,000 Products Import & Export',
                    'Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy, Ebay',
                    'Renews monthly',
                    'Priority support',
                ]
            },
            {
                name: 'CITADEL PLAN',
                price: 499.99,
                features: [
                    '50,000 Products Import & Export',
                    'Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy, Ebay',
                    'Renews monthly',
                    'Priority support',
                ]
            }
        ];

        console.log('[Billing API] Returning response with:', {
            hasSubscription: !!subscription,
            plan: subscription.plan,
            status: subscription.status,
            plansCount: Object.keys(PLANS).length
        });

        return json({
            subscription: {
                plan: subscription.plan,
                status: subscription.status,
                importCount: subscription.importCount || 0,
                exportCount: subscription.exportCount || 0,
                limits: PLANS[subscription.plan],
                nextBillingDate: subscription.nextBillingDate,
            },
            plans: Object.entries(PLANS).map(([name, plan]) => ({
                name,
                price: plan.price,
                features: plan.features,
                platforms: plan.platforms
            }))
        });
    } catch (error) {
        console.error('[Billing API] Error:', {
            message: error.message,
            stack: error.stack
        });
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

export const action = async ({ request }) => {
    try {
        const { session } = await authenticate.admin(request);
        if (!session) {
            return redirect('/auth');
        }

        const formData = await request.formData();
        const planName = formData.get('plan');

        if (!planName || !PLANS[planName]) {
            return json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        const plan = PLANS[planName];
        
        // Get the current URL to construct the proper return URL
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        
        // Create recurring charge
        const response = await fetch(`https://${session.shop}/admin/api/2024-01/recurring_application_charges.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': session.accessToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recurring_application_charge: {
                    name: plan.name,
                    price: plan.price,
                    return_url: `${baseUrl}/billing/confirm?shop=${session.shop}&plan=${planName}`,
                    test: process.env.NODE_ENV !== 'production',
                    trial_days: 0,
                    terms: 'Monthly subscription',
                    capped_amount: plan.price,
                    interval: 'EVERY_30_DAYS'
                },
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.recurring_application_charge?.confirmation_url) {
            console.error('[Billing API] Charge creation failed:', data);
            return json({ error: 'Charge creation failed' }, { status: 500 });
        }

        // Store pending subscription
        await Subscription.findOneAndUpdate(
            { shopId: session.shop },
            {
                shopifyChargeId: data.recurring_application_charge.id,
                plan: planName,
                status: 'pending',
                test: process.env.NODE_ENV !== 'production'
            },
            { upsert: true }
        );

        return redirect(data.recurring_application_charge.confirmation_url);
    } catch (error) {
        console.error('[Billing API] Error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

export async function getSubscription(shop) {
    if (!shop) {
        throw new Error('Shop parameter is required');
    }

    const subscription = await Subscription.findOne({ shopId: shop });

    if (!subscription) {
        return {
            plan: 'FREE',
            status: 'active',
            importCount: 0,
            exportCount: 0,
            limits: PLANS['FREE'],
            nextBillingDate: null
        };
    }

    return {
        plan: subscription.plan,
        status: subscription.status,
        importCount: subscription.importCount,
        exportCount: subscription.exportCount,
        limits: PLANS[subscription.plan],
        nextBillingDate: subscription.nextBillingDate,
    };
}
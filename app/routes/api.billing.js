import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { Shop } from '../models/Shop.js';
import { Subscription } from '../models/subscription.js';
import { PLANS } from '../config/plans.js';
import { connectDatabase } from '../utils/database.js';

export const loader = async ({ request }) => {
    let shop = null;
    try {
        console.log('[Billing API] Loader called. Request URL:', request.url);
        console.log('[Billing API] Request headers:', Object.fromEntries(request.headers.entries()));
        
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

        // Get shop name from query params
        const url = new URL(request.url);
        const shopName = url.searchParams.get('shop');
        
        if (!shopName) {
            console.error('[Billing API] No shop name provided');
            return json({ error: 'Shop name is required' }, { status: 400 });
        }

        // Get access token from headers
        const accessToken = request.headers.get('X-Shopify-Access-Token');
        if (!accessToken) {
            console.error('[Billing API] No access token provided');
            return json({ error: 'Access token is required' }, { status: 401 });
        }

        // Find shop ID from database using shop name
        try {
            shop = await Shop.findOne({ shop: shopName });
            if (!shop) {
                console.error('[Billing API] Shop not found:', shopName);
                return json({ error: 'Shop not found' }, { status: 404 });
            }
            console.log('[Billing API] Found shop:', {
                shopId: shop._id,
                shopName: shop.shop
            });
        } catch (dbError) {
            console.error('[Billing API] Error finding shop:', {
                message: dbError.message,
                stack: dbError.stack
            });
            return json({ error: 'Failed to find shop' }, { status: 500 });
        }

        const shopId = shop._id;
        console.log('[Billing API] Processing request for shop ID:', shopId);

        // Get current subscription
        let subscription;
        try {
            subscription = await Subscription.findOne({ shopId: shopId });
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
                console.log('[Billing API] Creating new FREE subscription for shop ID:', shopId);
                subscription = await Subscription.create({
                    shopId: shopId,
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
            stack: error.stack,
            shop: shop ? { id: shop._id, name: shop.shop } : null
        });
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

export const action = async ({ request }) => {
    let shop = null;
    try {
        console.log('[Billing API] Action called. Request URL:', request.url);
        console.log('[Billing API] Request headers:', Object.fromEntries(request.headers.entries()));
        const { session } = await authenticate.admin(request);
        console.log('[Billing API] Session:', session);
        if (!session) {
            console.warn('[Billing API] No valid session found. Redirecting to /auth.', { session });
            return redirect('/auth');
        }

        const formData = await request.formData();
        const planName = formData.get('plan');
        const shopName = formData.get('shop');

        if (!shopName) {
            return json({ error: 'Shop name is required' }, { status: 400 });
        }

        // Find shop ID from database
        try {
            shop = await Shop.findOne({ shop: shopName });
            if (!shop) {
                console.error('[Billing API] Shop not found:', shopName);
                return json({ error: 'Shop not found' }, { status: 404 });
            }
        } catch (dbError) {
            console.error('[Billing API] Error finding shop:', {
                message: dbError.message,
                stack: dbError.stack
            });
            return json({ error: 'Failed to find shop' }, { status: 500 });
        }

        const shopId = shop._id;

        if (!planName || !PLANS[planName]) {
            return json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        const plan = PLANS[planName];
        
        // Get the current URL to construct the proper return URL
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        
        console.log('[Billing API] Creating recurring charge for plan:', planName);
        
        const returnUrl = `${baseUrl}/app/billing?shop=${shopName}&plan=${planName}`;
        console.log('[Billing API] Using return_url for charge:', returnUrl);
        
        // Create recurring charge with Shopify
        const response = await fetch(`https://${session.shop}/admin/api/2024-01/recurring_application_charges.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': session.accessToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recurring_application_charge: {
                    name: planName,
                    price: plan.price,
                    return_url: returnUrl,
                    test: process.env.NODE_ENV !== 'production',
                    trial_days: 0,
                    terms: 'Monthly subscription',
                    capped_amount: plan.price,
                    interval: 'EVERY_30_DAYS',
                    billing_on: new Date().toISOString().split('T')[0],
                    activated_on: null,
                    cancelled_on: null,
                    trial_ends_on: null,
                    balance_used: 0,
                    balance_remaining: plan.price,
                    risk_level: 0
                },
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.recurring_application_charge?.confirmation_url) {
            console.error('[Billing API] Charge creation failed:', data);
            return json({ error: 'Charge creation failed' }, { status: 500 });
        }

        console.log('[Billing API] Charge created successfully, redirecting to:', data.recurring_application_charge.confirmation_url);

        // Return the confirmation URL for the client to redirect to
        return json({ 
            confirmationUrl: data.recurring_application_charge.confirmation_url 
        });
    } catch (error) {
        console.error('[Billing API] Error in action:', {
            message: error.message,
            stack: error.stack,
            shop: shop ? { id: shop._id, name: shop.shop } : null
        });
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

export async function getSubscription(shopName) {
    if (!shopName) {
        throw new Error('Shop name parameter is required');
    }

    // Find shop ID from database
    const shop = await Shop.findOne({ shop: shopName });
    if (!shop) {
        throw new Error('Shop not found');
    }

    const shopId = shop._id;
    const subscription = await Subscription.findOne({ shopId: shopId });

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
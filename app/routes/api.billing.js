import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { Shop } from '../models/Shop.js';
import { Subscription } from '../models/subscription.js';
import { PLANS } from '../config/plans.js';
import { connectDatabase } from '../utils/database.js';

export const loader = async ({ request }) => {
    let shop = null;
    try {
        // Ensure database connection
        try {
            await connectDatabase();
        } catch (dbError) {
            return json({ error: 'Database connection failed' }, { status: 500 });
        }

        // Get shop name from query params
        const url = new URL(request.url);
        const shopName = url.searchParams.get('shop');
        
        if (!shopName) {
            return json({ error: 'Shop name is required' }, { status: 400 });
        }

        // Get access token from headers
        const accessToken = request.headers.get('X-Shopify-Access-Token');
        if (!accessToken) {
            return json({ error: 'Access token is required' }, { status: 401 });
        }

        // Find shop ID from database using shop name
        try {
            shop = await Shop.findOne({ shop: shopName });
            if (!shop) {
                return json({ error: 'Shop not found' }, { status: 404 });
            }
        } catch (dbError) {
            return json({ error: 'Failed to find shop' }, { status: 500 });
        }

        const shopId = shop._id;

        // Get current subscription
        let subscription;
        try {
            subscription = await Subscription.findOne({ shopId: shopId });
        } catch (dbError) {
            return json({ error: 'Failed to fetch subscription' }, { status: 500 });
        }
        
        // If no subscription exists, create a new FREE subscription
        if (!subscription) {
            try {
                subscription = await Subscription.create({
                    shopId: shopId,
                    accessToken: accessToken,
                    plan: 'FREE',
                    status: 'active',
                    importCount: 0,
                    exportCount: 0,
                    allowedPlatforms: PLANS['FREE'].platforms
                });
            } catch (createError) {
                return json({ error: 'Failed to create subscription' }, { status: 500 });
            }
        }

        // Validate subscription plan exists
        if (!PLANS[subscription.plan]) {
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
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

export const action = async ({ request }) => {
    let shop = null;
    try {
        const { session } = await authenticate.admin(request);
        if (!session) {
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
                return json({ error: 'Shop not found' }, { status: 404 });
            }
        } catch (dbError) {
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
        
        const returnUrl = `${baseUrl}/app/billing?shop=${shopName}&plan=${planName}`;
        
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
            return json({ error: 'Charge creation failed' }, { status: 500 });
        }

        return json({ 
            confirmationUrl: data.recurring_application_charge.confirmation_url 
        });
    } catch (error) {
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
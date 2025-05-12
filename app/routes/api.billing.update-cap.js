import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';
import { Subscription } from '../models/subscription.js';
import { Shop } from '../models/Shop.js';

export const action = async ({ request }) => {
    try {
        const { session } = await authenticate.admin(request);
        if (!session) {
            return redirect('/auth');
        }

        const url = new URL(request.url);
        const shopName = url.searchParams.get('shop');
        const newAmount = url.searchParams.get('amount');

        if (!shopName || !newAmount) {
            return json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const shop = await Shop.findOne({ shop: shopName });
        if (!shop) {
            return json({ error: 'Shop not found' }, { status: 404 });
        }

        const subscription = await Subscription.findOne({ shopId: shop._id });
        if (!subscription || !subscription.shopifyChargeId) {
            return json({ error: 'No active subscription found' }, { status: 404 });
        }

        // Update the capped amount with Shopify
        const response = await fetch(
            `https://${session.shop}/admin/api/2024-01/recurring_application_charges/${subscription.shopifyChargeId}/customize.json`,
            {
                method: 'PUT',
                headers: {
                    'X-Shopify-Access-Token': session.accessToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recurring_application_charge: {
                        capped_amount: parseFloat(newAmount)
                    }
                }),
            }
        );

        if (!response.ok) {
            return json({ error: 'Failed to update capped amount' }, { status: 500 });
        }

        // Update local subscription record
        await Subscription.findOneAndUpdate(
            { shopId: shop._id },
            { balanceRemaining: parseFloat(newAmount) }
        );

        return json({ success: true });
    } catch (error) {
        console.error('[Billing API] Update cap error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}; 
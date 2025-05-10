import { redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';
import { Subscription } from '../models/subscription.js';
import { PLANS } from '../config/plans.js';

export const loader = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const shop = url.searchParams.get('shop');
        const plan = url.searchParams.get('plan');
        const chargeId = url.searchParams.get('charge_id');

        if (!shop || !chargeId) {
            return redirect('/billing');
        }

        const { session } = await authenticate.admin(request);
        if (!session) {
            return redirect('/auth');
        }

        // Get charge status
        const response = await fetch(`https://${shop}/admin/api/2024-01/recurring_application_charges/${chargeId}.json`, {
            headers: {
                'X-Shopify-Access-Token': session.accessToken,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        const charge = data.recurring_application_charge;

        if (!charge) {
            return redirect('/billing');
        }

        if (charge.status === 'accepted') {
            // Activate the charge
            const activateResponse = await fetch(`https://${shop}/admin/api/2024-01/recurring_application_charges/${chargeId}/activate.json`, {
                method: 'POST',
                headers: {
                    'X-Shopify-Access-Token': session.accessToken,
                    'Content-Type': 'application/json',
                },
            });

            if (!activateResponse.ok) {
                return redirect('/billing');
            }

            // Update subscription in database
            await Subscription.findOneAndUpdate(
                { shopId: shop },
                {
                    shopifyChargeId: chargeId,
                    plan: plan || 'FREE',
                    status: 'active',
                    nextBillingDate: new Date(charge.next_billing_date),
                    currentPeriodEnd: new Date(charge.next_billing_date),
                    test: process.env.NODE_ENV !== 'production',
                    allowedPlatforms: PLANS[plan || 'FREE'].platforms
                },
                { upsert: true }
            );
        } else if (charge.status === 'declined') {
            // Update subscription status to cancelled
            await Subscription.findOneAndUpdate(
                { shopId: shop },
                { status: 'cancelled' },
                { upsert: true }
            );
        }

        return redirect('/billing');
    } catch (error) {
        console.error('[Billing Confirm] Error:', error);
        return redirect('/billing');
    }
}; 
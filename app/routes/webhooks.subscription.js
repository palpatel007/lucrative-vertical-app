import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';
import { Subscription } from '../models/subscription.js';
import { Shop } from '../models/Shop.js';

export const action = async ({ request }) => {
    try {
        console.log('[Webhook] Received webhook request');
        const { topic, shop, session } = await authenticate.webhook(request);

        if (!session) {
            console.error('[Webhook] Unauthorized webhook request');
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await request.json();
        console.log('[Webhook] Processing webhook:', {
            topic,
            shop,
            payload: JSON.stringify(payload, null, 2)
        });

        switch (topic) {
            case 'APP_SUBSCRIPTIONS_UPDATE':
                await handleSubscriptionUpdate(payload, shop);
                break;
            case 'APP_SUBSCRIPTIONS_CANCEL':
                await handleSubscriptionCancel(payload, shop);
                break;
            case 'APP_SUBSCRIPTIONS_PAYMENT_FAILURE':
                await handlePaymentFailure(payload, shop);
                break;
            default:
                console.log(`[Webhook] Unhandled topic: ${topic}`);
        }

        console.log('[Webhook] Successfully processed webhook');
        return json({ success: true });
    } catch (error) {
        console.error('[Webhook] Error:', {
            message: error.message,
            stack: error.stack
        });
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

async function handleSubscriptionUpdate(payload, shop) {
    try {
        console.log('[Webhook] Handling subscription update');
        const subscription = await Subscription.findOne({ shopId: shop });
        if (!subscription) {
            console.log('[Webhook] No subscription found for shop:', shop);
            return;
        }

        const charge = payload.app_subscription;
        if (!charge) {
            console.log('[Webhook] No charge data in payload');
            return;
        }

        console.log('[Webhook] Updating subscription:', {
            shop,
            status: charge.status,
            nextBillingDate: charge.next_billing_date
        });
        const shopRecord = await Shop.findOne({ shop: session.shop });
        if (!shopRecord) throw new Error('Shop not found');
        
        await Subscription.findOneAndUpdate(
            { shopId: shopRecord._id },
            {
                status: charge.status,
                nextBillingDate: new Date(charge.next_billing_date),
                currentPeriodEnd: new Date(charge.next_billing_date),
                lastBillingDate: new Date(),
                shopifyChargeId: charge.id
            }
        );

        console.log('[Webhook] Successfully updated subscription');
    } catch (error) {
        console.error('[Webhook] Error handling subscription update:', {
            message: error.message,
            stack: error.stack
        });
    }
}

async function handleSubscriptionCancel(payload, shop) {
    try {
        console.log('[Webhook] Handling subscription cancellation');
        const charge = payload.app_subscription;
        if (!charge) {
            console.log('[Webhook] No charge data in payload');
            return;
        }

        console.log('[Webhook] Cancelling subscription:', {
            shop,
            chargeId: charge.id
        });
        const shopRecord = await Shop.findOne({ shop: session.shop });
        if (!shopRecord) throw new Error('Shop not found');
        
        await Subscription.findOneAndUpdate(
          { shopId: shopRecord._id }, // ✅ correct ID
          { 
                status: 'cancelled',
                cancelledAt: new Date(),
                shopifyChargeId: charge.id
            }
        );

        console.log('[Webhook] Successfully cancelled subscription');
    } catch (error) {
        console.error('[Webhook] Error handling subscription cancel:', {
            message: error.message,
            stack: error.stack
        });
    }
}

async function handlePaymentFailure(payload, shop) {
    try {
        console.log('[Webhook] Handling payment failure');
        const charge = payload.app_subscription;
        if (!charge) {
            console.log('[Webhook] No charge data in payload');
            return;
        }

        console.log('[Webhook] Processing payment failure:', {
            shop,
            chargeId: charge.id
        });
        const shopRecord = await Shop.findOne({ shop: session.shop });
        if (!shopRecord) throw new Error('Shop not found');
        
        await Subscription.findOneAndUpdate(
          { shopId: shopRecord._id }, // ✅ correct ID
          { 
                status: 'payment_failed',
                lastPaymentFailure: new Date(),
                shopifyChargeId: charge.id
            }
        );

        console.log('[Webhook] Successfully processed payment failure');
    } catch (error) {
        console.error('[Webhook] Error handling payment failure:', {
            message: error.message,
            stack: error.stack
        });
    }
} 
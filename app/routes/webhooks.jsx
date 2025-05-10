import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { Subscription } from '../models/subscription';

export const action = async ({ request }) => {
  const { topic, shop, session } = await authenticate.webhook(request);

  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();

  switch (topic) {
    case 'APP_SUBSCRIPTIONS_UPDATE':
      await handleSubscriptionUpdate(shop, payload);
      break;
    case 'APP_SUBSCRIPTIONS_CANCEL':
      await handleSubscriptionCancel(shop, payload);
      break;
    default:
      return json({ error: 'Unhandled webhook topic' }, { status: 400 });
  }

  return json({ success: true });
};

async function handleSubscriptionUpdate(shop, payload) {
  const subscription = await Subscription.findOne({ shopId: shop });
  
  if (!subscription) {
    return;
  }

  const appSubscription = payload.app_subscription;
  
  if (appSubscription.status === 'ACTIVE') {
    subscription.status = 'active';
    subscription.nextBillingDate = new Date(appSubscription.nextBillingDate);
    subscription.renewalDate = new Date(appSubscription.nextBillingDate);
  } else if (appSubscription.status === 'CANCELLED') {
    subscription.status = 'cancelled';
  } else if (appSubscription.status === 'EXPIRED') {
    subscription.status = 'expired';
  } else if (appSubscription.status === 'FROZEN') {
    subscription.status = 'frozen';
  }

  await subscription.save();
}

async function handleSubscriptionCancel(shop, payload) {
  const subscription = await Subscription.findOne({ shopId: shop });
  
  if (!subscription) {
    return;
  }

  subscription.status = 'cancelled';
  await subscription.save();
} 
import { authenticate } from "../shopify.server";
import { getSubscription, PLANS } from "../routes/api.billing.js";
import { Subscription } from '../models/subscription.js';
import mongoose from 'mongoose';

export async function checkSubscriptionQuota(shop) {
  if (!shop) {
    return { error: 'Shop parameter is required', status: 400 };
  }

  try {
    const subscription = await Subscription.findOne({ shopId: shop });
    
    // If no subscription exists, create a free one
    if (!subscription) {
      return {
        subscription: {
          plan: 'FREE',
          status: 'active',
          importCount: 0,
          exportCount: 0,
          nextBillingDate: null,
          limits: PLANS['FREE']
        }
      };
    }

    // Check if subscription is active
    if (subscription.status !== 'active') {
      return {
        error: 'Subscription is not active',
        status: 403,
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          nextBillingDate: subscription.nextBillingDate,
        },
        upgradeUrl: `/app/billing?shop=${shop}`
      };
    }

    // Check if quota is exceeded
    const limit = PLANS[subscription.plan].uploads;
    if (subscription.importCount >= limit) {
      return {
        error: 'Upload quota exceeded',
        status: 403,
        subscription: {
          plan: subscription.plan,
          importCount: subscription.importCount,
          limit,
          remainingUploads: limit - subscription.importCount,
        },
        upgradeUrl: `/app/billing?shop=${shop}`
      };
    }

    // All good
    return { subscription };
  } catch (error) {
    console.error('Error checking subscription quota:', error);
    return { error: 'Failed to check subscription quota', status: 500 };
  }
}

export async function requireActiveSubscription(shopId) {
  try {
    // Ensure shopId is an ObjectId
    const objectId = typeof shopId === 'string' ? mongoose.Types.ObjectId(shopId) : shopId;
    console.log('[Subscription Check] Looking for active subscription for shopId:', objectId);
    
    const subscription = await Subscription.findOne({
      shopId: objectId,
      status: 'active'
    });

    console.log('[Subscription Check] Found:', subscription);
    
    if (!subscription) {
      const error = new Error('Active subscription required');
      error.status = 402; // Payment Required
      throw error;
    }

    // Check if subscription is about to expire (within 7 days)
    if (subscription.nextBillingDate) {
      const daysUntilExpiry = Math.ceil((subscription.nextBillingDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7) {
        console.log(`[Subscription Check] Subscription expires in ${daysUntilExpiry} days`);
      }
    }

    return subscription;
  } catch (err) {
    console.error('[Subscription Check] Error in requireActiveSubscription:', err);
    throw err;
  }
}

export async function incrementUsage(shopId, type = 'import') {
  try {
    const updateField = type === 'import' ? 'importCount' : 'exportCount';
    const subscription = await Subscription.findOneAndUpdate(
      { shopId, status: 'active' },
      { $inc: { [updateField]: 1 } },
      { new: true }
    );

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    return subscription;
  } catch (error) {
    console.error(`Error incrementing ${type} count:`, error);
    throw error;
  }
}

export async function checkPlatformAccess(shopId, platform) {
  try {
    const subscription = await Subscription.findOne({ shopId });
    
    if (!subscription) {
      return false;
    }

    const limits = PLANS[subscription.plan];
    return limits.platforms.includes(platform);
  } catch (error) {
    console.error('Error checking platform access:', error);
    return false;
  }
} 
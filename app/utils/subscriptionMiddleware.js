import { Subscription } from '../models/subscription.js';
import mongoose from 'mongoose';
import { PLANS } from '../config/plans.js';
import { Shop } from '../models/Shop.js';

export async function checkSubscriptionQuota(shop) {
  if (!shop) {
    return { error: 'Shop parameter is required', status: 400 };
  }

  try {
    console.log('[Subscription] Checking quota for shop:', shop);
    
    // First find the shop to get its ID
    const shopDoc = await Shop.findOne({ shop });
    if (!shopDoc) {
      console.log('[Subscription] Shop not found:', shop);
      return { error: 'Shop not found', status: 404 };
    }

    // Now find subscription using shop's ID
    const subscription = await Subscription.findOne({ shopId: shopDoc._id });
    console.log('[Subscription] Found subscription:', {
      exists: !!subscription,
      plan: subscription?.plan,
      status: subscription?.status,
      importCount: subscription?.importCount,
      limits: subscription?.getPlanLimits?.()
    });
    
    // If no subscription exists, create a free one
    if (!subscription) {
      console.log('[Subscription] No subscription found, returning free plan');
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
      console.log('[Subscription] Subscription not active:', {
        plan: subscription.plan,
        status: subscription.status
      });
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
    const limit = PLANS[subscription.plan].importLimit;
    console.log('[Subscription] Checking quota:', {
      plan: subscription.plan,
      currentCount: subscription.importCount,
      limit,
      remaining: limit - subscription.importCount,
      rawSubscription: {
        plan: subscription.plan,
        status: subscription.status,
        importCount: subscription.importCount,
        limits: subscription.limits
      }
    });

    return { 
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        importCount: subscription.importCount,
        limits: PLANS[subscription.plan]
      }
    };
  } catch (error) {
    console.error('[Subscription] Error checking quota:', error);
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
    
    // First check if subscription exists
    let subscription = await Subscription.findOne({ shopId });
    
    if (!subscription) {
      console.log('[Subscription] No subscription found, creating free one for shop:', shopId);
      // Get shop to get access token
      const shop = await Shop.findOne({ _id: shopId });
      if (!shop) {
        throw new Error('Shop not found');
      }
      
      // Create new free subscription
      subscription = await Subscription.create({
        shopId,
        accessToken: shop.accessToken,
        plan: 'FREE',
        status: 'active',
        importCount: 0,
        exportCount: 0,
        nextBillingDate: null,
        limits: PLANS['FREE']
      });
    }

    // Now increment the count
    subscription = await Subscription.findOneAndUpdate(
      { shopId },
      { $inc: { [updateField]: 1 } },
      { new: true }
    );

    if (!subscription) {
      throw new Error('Failed to update subscription');
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
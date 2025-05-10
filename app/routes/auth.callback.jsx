import { redirect } from '@remix-run/node';
import { authenticate } from "../shopify.server.js";
import { connectDatabase } from "../utils/database";
import { Shop } from "../models/Shop";
import { Subscription } from "../models/subscription";
import { registerWebhooks } from '../utils/registerWebhooks.js';

export const loader = async ({ request }) => {
  try {
    console.log('[Auth Callback] Starting authentication process...');
    
    // Connect to database first
    await connectDatabase();
    console.log('[Auth Callback] Database connected successfully');

    const { session } = await authenticate.admin(request);
    console.log('[Auth Callback] Admin authenticated successfully', {
      shop: session.shop,
      accessToken: session.accessToken ? 'present' : 'missing'
    });

    // Ensure shop document exists
    let shop = await Shop.findOne({ shop: session.shop });
    
    if (!shop) {
      console.log('[Auth Callback] Creating new shop document...');
      shop = await Shop.create({
        shop: session.shop,
        accessToken: session.accessToken,
        importCount: 0,
        exportCount: 0,
        lastLogin: new Date()
      });
      console.log('[Auth Callback] Shop document created:', {
        id: shop._id,
        shop: shop.shop
      });
    } else {
      console.log('[Auth Callback] Updating existing shop document...');
      shop.accessToken = session.accessToken;
      shop.lastLogin = new Date();
      await shop.save();
      console.log('[Auth Callback] Shop document updated:', {
        id: shop._id,
        shop: shop.shop
      });
    }

    // Ensure subscription exists
    let subscription = await Subscription.findOne({ shopId: shop._id });
    
    if (!subscription) {
      console.log('[Auth Callback] Creating free subscription...');
      subscription = await Subscription.create({
        shopId: shop._id,
        shopRef: shop.shop,
        plan: 'free',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
      console.log('[Auth Callback] Free subscription created:', {
        id: subscription._id,
        shopId: subscription.shopId,
        plan: subscription.plan
      });
    }

    // Register webhooks after successful installation
    await registerWebhooks(session.shop, session.accessToken);

    // Redirect to the app's main page
    return redirect('/app');
  } catch (error) {
    console.error('[Auth Callback] Error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return redirect('/auth');
  }
}; 
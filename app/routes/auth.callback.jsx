import { redirect } from '@remix-run/node';
import { authenticate } from "../shopify.server.js";
import { connectDatabase } from "../utils/database";
import { Shop } from "../models/Shop";
import { Subscription } from "../models/subscription";
import { registerWebhooks } from '../utils/registerWebhooks.js';
import prisma from '../db.server.js';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    // Connect to database first
    await connectDatabase();

    // Destroy old sessions for this shop before proceeding
    try {
      const deleted = await prisma.session.deleteMany({ where: { shop: session.shop } });
    } catch (err) {
    }

    // Ensure shop document exists
    let shop = await Shop.findOne({ shop: session.shop });
    
    if (!shop) {
      shop = await Shop.create({
        shop: session.shop,
        accessToken: session.accessToken,
        importCount: 0,
        exportCount: 0,
        lastLogin: new Date()
      });
    } else {
      shop.accessToken = session.accessToken;
      shop.lastLogin = new Date();
      await shop.save();
    }

    // Ensure subscription exists
    let subscription = await Subscription.findOne({ shopId: shop._id });
    
    if (!subscription) {
      subscription = await Subscription.create({
        shopId: shop._id,
        shopRef: shop.shop,
        plan: 'free',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
    }

    // Register webhooks after successful installation
    await registerWebhooks(session.shop, session.accessToken);

    // Handle returnTo parameter for post-auth redirect
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('returnTo') || '/app';

    // Redirect to the specified returnTo path or the app's main page
    return redirect(returnTo);
  } catch (error) {
    return redirect('/auth');
  }
}; 
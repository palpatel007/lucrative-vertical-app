import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { Shop } from '../models/Shop';
import { connectDatabase } from '../utils/database';
import StoreStats from '../models/StoreStats';
// import { requireActiveSubscription } from '../utils/subscriptionMiddleware';

export const loader = async ({ request }) => {
  try {
    // Ensure database connection
    try {
      await connectDatabase();
    } catch (dbError) {
      console.error('[Stats] Database connection error:', dbError);
      return json({
        totalProduct: 0,
        import: 0,
        export: 0
      });
    }

    // Get shop from query parameter
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    if (!shop) {
      return json({ error: 'Missing shop parameter', totalProduct: 0, import: 0, export: 0 }, { status: 400 });
    }

    // Get shop document first
    const shopDoc = await Shop.findOne({ shop });
    if (!shopDoc) {
      console.log('[Stats] No shop document found for:', shop);
      return json({
        totalProduct: 0,
        import: 0,
        export: 0
      });
    }
    // No subscription check here

    // Shopify product count (optional, if you want to keep this logic)
    let totalProduct = 0;
    try {
      const { admin } = await authenticate.admin(request);
      const productCountQuery = `{
        productsCount {
          count
        }
      }`;
      const response = await admin.graphql(productCountQuery);
      const data = await response.json();
      totalProduct = data.data.productsCount.count;
    } catch (err) {
      console.error('[Stats] Error fetching product count:', err);
    }

    // Get store stats
    let storeStats;
    try {
      storeStats = await StoreStats.findOne({ shopId: shopDoc._id });
      console.log('[Stats] Found store stats:', {
        shop: shop,
        shopId: shopDoc._id,
        stats: storeStats
      });
    } catch (err) {
      console.error('[Stats] Error fetching store stats:', err);
      storeStats = null;
    }

    const stats = {
      totalProduct,
      import: storeStats?.importCount || 0,
      export: storeStats?.exportCount || 0
    };

    console.log('[Stats] Returning stats:', stats);
    return json(stats);
  } catch (error) {
    console.error('[Stats] Error:', error);
    return json({ 
      error: 'Failed to fetch stats',
      totalProduct: 0,
      import: 0,
      export: 0
    }, { status: 500 });
  }
}; 
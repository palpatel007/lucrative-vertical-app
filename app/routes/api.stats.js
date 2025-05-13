import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { Shop } from '../models/Shop';
import { connectDatabase } from '../utils/database';
import StoreStats from '../models/StoreStats';
import ImportExportEvent from '../models/ImportExportEvent';
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
    const range = parseInt(url.searchParams.get('range') || '7', 10); // days
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

    // Aggregate import/export events for the selected range
    const sinceDate = new Date(Date.now() - range * 24 * 60 * 60 * 1000);
    const [importAgg, exportAgg] = await Promise.all([
      ImportExportEvent.aggregate([
        { $match: { shopId: shopDoc._id, type: 'import', date: { $gte: sinceDate } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]),
      ImportExportEvent.aggregate([
        { $match: { shopId: shopDoc._id, type: 'export', date: { $gte: sinceDate } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ])
    ]);
    const importCount = importAgg[0]?.total || 0;
    const exportCount = exportAgg[0]?.total || 0;

    const stats = {
      totalProduct,
      import: importCount,
      export: exportCount
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
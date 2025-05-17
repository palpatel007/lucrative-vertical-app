import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { ImportProgress } from '../models/ImportProgress.js';
import { Shop } from '../models/Shop.js';

export const loader = async ({ request }) => {
  try {
    console.log('[Active Imports] Starting request...');
    
    const { admin, session } = await authenticate.admin(request);
    console.log('[Active Imports] Session:', { 
      hasSession: !!session,
      shop: session?.shop,
      hasAccessToken: !!session?.accessToken,
      hasAdmin: !!admin
    });

    if (!session?.shop) {
      console.error('[Active Imports] No shop in session');
      return json({ success: false, error: 'Please log in to continue' }, { status: 401 });
    }

    // Find the shop document using session shop
    const shop = await Shop.findOne({ shop: session.shop });
    if (!shop) {
      console.error('[Active Imports] Shop not found:', session.shop);
      return json({ success: false, error: 'Shop not found' }, { status: 404 });
    }

    console.log('[Active Imports] Found shop:', { id: shop._id, shop: shop.shop });

    // Get active imports for this shop
    const activeImports = await ImportProgress.find({
      shopId: shop._id,
      status: { $in: ['in_progress'] }
    }).sort({ createdAt: -1 });

    console.log('[Active Imports] Found imports:', { count: activeImports.length });

    return json({
      success: true,
      imports: activeImports.map(importData => ({
        _id: importData._id,
        format: importData.format,
        totalProducts: importData.totalProducts,
        processedProducts: importData.processedProducts,
        successfulProducts: importData.successfulProducts,
        failedProducts: importData.failedProducts,
        status: importData.status,
        createdAt: importData.createdAt
      }))
    });
  } catch (error) {
    console.error('[Active Imports] Error:', {
      message: error.message,
      stack: error.stack
    });
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 
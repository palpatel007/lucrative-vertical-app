import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { headers, mapProduct, mapToShopify } from '../csv-templates/woocommerce.js';
import { Shop } from '../models/Shop';
import StoreStats from '../models/StoreStats.js';
import { requireActiveSubscription } from '../utils/subscriptionMiddleware';

export const action = async ({ request }) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const format = searchParams.get('format') || 'woocommerce';
  const type = searchParams.get('type') || 'all';
  let productIds = [];
  let exportLimit = 100; // Default fallback value
  try {
    const body = await request.json();
    productIds = body.productIds || [];
  } catch (e) {
    console.log('[Export][Request] No JSON body or productIds:', e);
  }

  console.log('[Export][Request] Incoming export request', {
    format,
    type,
    productIdsLength: productIds.length,
    productIds: productIds,
    url: request.url
  });

  let admin, shopifySession, shopDoc;
  try {
    const { admin: shopifyAdmin, session } = await authenticate.admin(request);
    shopifySession = session;
    if (!shopifySession?.shop) {
      console.log('[Export][Auth] No shop in session');
      return json({ success: false, error: 'Please log in to continue' }, { status: 401 });
    }
    if (!shopifyAdmin) {
      console.log('[Export][Auth] No admin access');
      return json({ success: false, error: 'No admin access' }, { status: 401 });
    }
    admin = shopifyAdmin;
    // Find the Shop document by shop domain
    shopDoc = await Shop.findOne({ shop: shopifySession.shop });
    console.log('[Export][Shop] shopDoc:', shopDoc);
    // Enforce active subscription
    try {
      await requireActiveSubscription(shopDoc._id);
      console.log('[Export][Subscription] Active subscription confirmed for shop:', shopDoc.shop);
    } catch (err) {
      console.log('[Export][Subscription] No active subscription:', err);
      throw redirect(`/app/billing?shop=${shopDoc.shop}`);
    }

    // Check plan limits before proceeding
    const { checkPlanLimits } = await import('../utils/planLimits.js');
    const limitCheck = await checkPlanLimits(shopDoc._id, 'export', productIds.length);
    console.log('[Export][PlanLimits] limitCheck:', limitCheck);
    if (!limitCheck.allowed) {
      console.log('[Export][PlanLimits] Export not allowed:', limitCheck);
      return json({
        success: false,
        error: `Export limit exceeded. Your ${limitCheck.plan} plan allows ${limitCheck.limit} exports. You have used ${limitCheck.current} and tried to export ${productIds.length} more.`,
        details: {
          current: limitCheck.current,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining,
          plan: limitCheck.plan
        },
        upgradeUrl: `/app/billing?shop=${shopDoc.shop}`
      }, { status: 403 });
    }

    // Enforce the export limit for the plan BEFORE fetching
    exportLimit = limitCheck.limit - limitCheck.current;
    if (type === 'selected' && productIds.length > exportLimit) {
      console.log('[Export][PlanLimits] Slicing productIds to exportLimit:', exportLimit);
      productIds = productIds.slice(0, exportLimit);
    }
  } catch (error) {
    console.log('[Export][Error] Auth/subscription/plan error:', error);
    return json({ success: false, error: 'Please log in to continue' }, { status: 401 });
  }

  // Fetch products from Shopify
  let products = [];
  try {
    if (type === 'selected' && productIds.length > 0) {
      console.log('[Export][Shopify] Fetching selected products:', productIds);
      for (const id of productIds) {
        const gid = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;
        const singleQuery = `{
          product(id: "${gid}") {
            id title handle status vendor productType tags bodyHtml description
            images(first: 10) { edges { node { url src } } }
            variants(first: 1) { edges { node { sku price compareAtPrice inventoryQuantity } } }
          }
        }`;
        const response = await admin.graphql(singleQuery);
        const data = await response.json();
        if (data.data?.product) {
          const node = data.data.product;
          products.push({
            ...node,
            images: node.images?.edges?.map(e => e.node) || [],
            variants: node.variants?.edges?.map(e => e.node) || [],
          });
        } else {
          console.log('[Export][Shopify] No product found for id:', id, data);
        }
      }
      console.log('[Export][Shopify] Selected products fetched:', products.length);
    } else {
      let query = `query getProducts($first: Int!, $query: String) {
        products(first: $first, query: $query) {
          edges { node {
            id title handle status vendor productType tags bodyHtml description
            images(first: 10) { edges { node { url src } } }
            variants(first: 1) { edges { node { sku price compareAtPrice inventoryQuantity } } }
          }}
        }
      }`;
      let variables = { first: 100, query: null };
      const response = await admin.graphql(query, { variables });
      const responseJson = await response.json();
      if (!responseJson.data?.products) {
        console.error('[Export][Shopify] Failed to fetch products:', responseJson);
        return json({ success: false, error: 'Failed to fetch products', details: responseJson }, { status: 500 });
      }
      products = responseJson.data.products.edges.map(edge => {
        const node = edge.node;
        return {
          ...node,
          images: node.images?.edges?.map(e => e.node) || [],
          variants: node.variants?.edges?.map(e => e.node) || [],
        };
      });
      console.log('[Export][Shopify] All products fetched:', products.length);
      // For 'all' case, fetch all products and then slice to exportLimit
      if (products.length > exportLimit) {
        console.log('[Export][PlanLimits] Slicing products to exportLimit:', exportLimit);
        products = products.slice(0, exportLimit);
      }
    }
  } catch (error) {
    console.error('[Export][Error] Error fetching products:', error);
    return json({ success: false, error: 'Failed to fetch products', details: error.message }, { status: 500 });
  }

  // Use the correct template
  let headersArr = [];
  let mapProductFn = null;
  if (format === 'woocommerce') {
    headersArr = headers;
    mapProductFn = (shopifyProduct) => {
      const variant = shopifyProduct.variants?.[0] || {};
      const id = shopifyProduct.id?.split('/')?.pop() || '';
      const inventory = variant.inventoryQuantity ?? '';
      const images = (shopifyProduct.images || shopifyProduct.image ? [shopifyProduct.image] : [])
        .map(img => img?.src || img?.url || img)
        .filter(Boolean)
        .join(',');
      const categories = shopifyProduct.product_type || shopifyProduct.type || '';
      const tags = Array.isArray(shopifyProduct.tags)
        ? shopifyProduct.tags.join(',')
        : (shopifyProduct.tags || '');
      return [
        id, // ID
        'simple', // Type
        variant.sku || shopifyProduct.handle, // SKU
        shopifyProduct.title, // Name
        (shopifyProduct.status || '').toLowerCase() === 'active' ? '1' : '0', // Published
        '', // Is featured?
        'visible', // Visibility in catalog
        '', // Short description
        shopifyProduct.body_html || shopifyProduct.description || '', // Description
        '', '', // Date sale price starts/ends
        'taxable', // Tax status
        '', // Tax class
        inventory, // In stock?
        inventory, // Stock
        '', // Backorders allowed?
        '', // Sold individually?
        '', // Weight (kg)
        '', '', '', // Length, Width, Height (cm)
        '', // Allow customer reviews?
        '', // Purchase note
        variant.compareAtPrice || '', // Sale price
        variant.price || '', // Regular price
        categories, // Categories
        tags, // Tags
        '', // Shipping class
        images, // Images
        '', '', // Download limit, Download expiry days
        '', // Parent
        '', // Grouped products
        '', // Upsells
        '', // Cross-sells
        '', // External URL
        '', // Button text
        '', // Position
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
      ];
    };
  } else {
    return json({ success: false, error: 'Unsupported format' }, { status: 400 });
  }

  // Generate CSV
  let filteredProducts = products;
  if (type === 'selected' && productIds.length > 0) {
    const idSet = new Set(productIds.map(id => id.toString()));
    filteredProducts = products.filter(p => idSet.has(p.id?.split('/')?.pop()));
  }
  const rows = [headersArr].concat(filteredProducts.map(mapProductFn));
  const csv = rows.map(row => row.map(cell => {
    if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
      return '"' + cell.replace(/"/g, '""') + '"';
    }
    return cell;
  }).join(',')).join('\r\n');

  // After successful export, increment exportCount
  if (shopifySession?.shop && products.length > 0) {
    try {
      // Get current stats before update
      const currentStats = await StoreStats.findOne({ shopId: shopDoc._id });
      const previousCount = currentStats ? currentStats.exportCount : 0;

      // Update or create StoreStats document
      const storeStats = await StoreStats.findOneAndUpdate(
        { shopId: shopDoc._id },
        { 
          $setOnInsert: { 
            shopId: shopDoc._id
          },
          $inc: { exportCount: products.length }
        },
        { upsert: true, new: true }
      );

      console.log(`[Export] Shop: ${shopifySession.shop} | Export count updated:`, {
        shopId: shopDoc._id,
        previousCount,
        newCount: storeStats.exportCount,
        increment: products.length
      });
    } catch (err) {
      console.error('[Export] Failed to update export count:', err);
    }
  }

  // Log before sending the file
  console.log('[Export][Response] Sending CSV file with', products.length, 'products');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=products-${format}.csv`,
    },
  });
}; 
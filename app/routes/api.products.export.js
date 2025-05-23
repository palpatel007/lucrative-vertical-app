import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { headers, mapProduct, mapToShopify } from '../csv-templates/woocommerce.js';
import { Shop } from '../models/Shop';
import StoreStats from '../models/StoreStats.js';
import { requireActiveSubscription } from '../utils/subscriptionMiddleware';
import { amazonParser } from '../utils/csvParsers/amazonParser.js';
import { wixParser } from '../utils/csvParsers/wixParser.js';
import { wooCommerceParser } from '../utils/csvParsers/wooCommerceParser.js';
import { customParser } from '../utils/csvParsers/customParser.js';
import { bigCommerceParser } from '../utils/csvParsers/bigCommerceParser.js';
import { squarespaceParser } from '../utils/csvParsers/squarespaceParser.js';
import { etsyParser } from '../utils/csvParsers/etsyParser.js';
import { alibabaParser } from '../utils/csvParsers/alibabaParser.js';
import { aliExpressParser } from '../utils/csvParsers/aliExpressParser.js';
import { ebayParser } from '../utils/csvParsers/ebayParser.js';
import { walmartParser } from '../utils/csvParsers/walmartParser.js';

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
    // console.log('[Export][PlanLimits] limitCheck:', limitCheck);
    if (!limitCheck.allowed) {
      // console.log('[Export][PlanLimits] Export not allowed:', limitCheck);
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
      // console.log('[Export][PlanLimits] Slicing productIds to exportLimit:', exportLimit);
      productIds = productIds.slice(0, exportLimit);
    }
  } catch (error) {
    // console.log('[Export][Error] Auth/subscription/plan error:', error);
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
      // For 'all' case, check if export limit is exceeded and return error if so
      if (type === 'all' && products.length > exportLimit) {
        return json({
          success: false,
          error: `Export limit reached. Your plan allows exporting up to ${exportLimit} products at a time.`,
          upgradeUrl: `/app/billing?shop=${shopDoc.shop}`
        }, { status: 403 });
      }
      // For 'all' case, fetch all products and then slice to exportLimit (legacy, should not be needed now)
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
  let csv = '';
  if (format === 'woocommerce') {
    csv = await wooCommerceParser.exportToCSV(products);
  } else if (format === 'amazon') {
    csv = await amazonParser.exportToCSV(products);
  } else if (format === 'wix') {
    csv = await wixParser.exportToCSV(products);
  } else if (format === 'bigcommerce') {
    csv = await bigCommerceParser.exportToCSV(products);
  } else if (format === 'shopify') {
    headersArr = [
      'Handle',
      'Title',
      'Body (HTML)',
      'Vendor',
      'Product Category',
      'Type',
      'Tags',
      'Published',
      'Option1 Name',
      'Option1 Value',
      'Option2 Name',
      'Option2 Value',
      'Option3 Name',
      'Option3 Value',
      'Variant SKU',
      'Variant Grams',
      'Variant Inventory Tracker',
      'Variant Inventory Qty',
      'Variant Inventory Policy',
      'Variant Fulfillment Service',
      'Variant Price',
      'Variant Compare At Price',
      'Variant Requires Shipping',
      'Variant Taxable',
      'Variant Barcode',
      'Image Src',
      'Image Position',
      'Image Alt Text',
      'Gift Card',
      'Google Shopping / Google Product Category',
      'SEO Title',
      'SEO Description',
      'Google Shopping / Gender',
      'Google Shopping / Age Group',
      'Google Shopping / Condition',
      'Google Shopping / Custom Product',
      'Google Shopping / Custom Label 0',
      'Google Shopping / Custom Label 1',
      'Google Shopping / Custom Label 2',
      'Google Shopping / Custom Label 3',
      'Google Shopping / Custom Label 4',
      'Variant Image',
      'Variant Weight Unit',
      'Variant Tax Code',
      'Cost per item',
      'Status'
    ];
    mapProductFn = (shopifyProduct) => {
      const variant = shopifyProduct.variants?.[0] || {};
      const image = shopifyProduct.images?.[0] || {};
      return [
        shopifyProduct.handle || '',
        shopifyProduct.title || '',
        shopifyProduct.body_html || '',
        shopifyProduct.vendor || '',
        '', // Product Category
        shopifyProduct.productType || shopifyProduct.product_type || '',
        Array.isArray(shopifyProduct.tags) ? shopifyProduct.tags.join(',') : (shopifyProduct.tags || ''),
        shopifyProduct.status === 'active' ? 'TRUE' : 'FALSE',
        'Title', // Option1 Name
        'Default Title', // Option1 Value
        '', // Option2 Name
        '', // Option2 Value
        '', // Option3 Name
        '', // Option3 Value
        variant.sku || '',
        variant.grams || '',
        'shopify', // Variant Inventory Tracker (force for Shopify)
        variant.inventory_quantity || '', // Variant Inventory Qty
        variant.inventory_policy || '',
        variant.fulfillment_service || '',
        variant.price || '',
        variant.compare_at_price || '',
        variant.requires_shipping ? 'TRUE' : 'FALSE',
        variant.taxable ? 'TRUE' : 'FALSE',
        variant.barcode || '',
        image.src || '',
        image.position || '',
        image.alt || '',
        '', // Gift Card
        '', // Google Shopping / Google Product Category
        shopifyProduct.metafields?.seo_title || '',
        shopifyProduct.metafields?.seo_description || '',
        '', // Google Shopping / Gender
        '', // Google Shopping / Age Group
        '', // Google Shopping / Condition
        '', // Google Shopping / Custom Product
        '', // Google Shopping / Custom Label 0
        '', // Google Shopping / Custom Label 1
        '', // Google Shopping / Custom Label 2
        '', // Google Shopping / Custom Label 3
        '', // Google Shopping / Custom Label 4
        '', // Variant Image
        variant.weight_unit || '',
        variant.tax_code || '',
        variant.cost || '',
        shopifyProduct.status || 'active'
      ];
    };
    let filteredProducts = products;
    if (type === 'selected' && productIds.length > 0) {
      const idSet = new Set(productIds.map(id => id.toString()));
      filteredProducts = products.filter(p => idSet.has(p.id?.split('/')?.pop()));
    }
    const rows = [headersArr].concat(filteredProducts.map(mapProductFn));
    csv = rows.map(row => row.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return '"' + cell.replace(/"/g, '""') + '"';
      }
      return cell;
    }).join(',')).join('\r\n');
  } else if (format === 'customcsv') {
    csv = await customParser.exportToCSV(products);
  } else if (format === 'squarespace') {
    csv = await squarespaceParser.exportToCSV(products);
  } else if (format === 'etsy') {
    csv = await etsyParser.exportToCSV(products);
  } else if (format === 'alibaba') {
    csv = await alibabaParser.exportToCSV(products);
  } else if (format === 'aliexpress') {
    csv = await aliExpressParser.exportToCSV(products);
  } else if (format === 'ebay') {
    csv = await ebayParser.exportToCSV(products);
  } else if (format === 'walmart') {
    csv = await walmartParser.exportToCSV(products);
  } else {
    return json({ success: false, error: 'Unsupported format' }, { status: 400 });
  }

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

  // Log ImportExportEvent for successful export
  try {
    if (products.length > 0) {
      const ImportExportEvent = (await import('../models/ImportExportEvent.js')).default;
      await ImportExportEvent.create({
        shopId: shopDoc._id,
        type: 'export',
        count: products.length,
        date: new Date(),
        platform: format
      });
    }
  } catch (eventErr) {
    console.error('[Export] Failed to log ImportExportEvent:', eventErr);
  }

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=products-${format}.csv`,
    },
  });
};

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  const type = url.searchParams.get('type');

  // Only handle GET for sample CSV
  if (type === 'sample' && format === 'customcsv') {
    // Generate sample data (reuse your sample logic)
    const headersArr = [
      'ID','Title','Description','SKU','Price','Compare At Price','Inventory','Status','Type','Vendor','Tags','Images','Handle'
    ];
    const sampleProduct = {
      id: '123456',
      title: 'Sample Product',
      description: 'This is a sample product description.',
      sku: 'SAMPLE-SKU-001',
      price: '19.99',
      compare_at_price: '24.99',
      inventory: 100,
      status: 'active',
      type: 'Sample Type',
      vendor: 'Sample Vendor',
      tags: 'sample,test',
      images: 'https://cdn.shopify.com/s/files/1/0000/0000/products/sample.jpg',
      handle: 'sample-product'
    };
    const row = [
      sampleProduct.id,
      sampleProduct.title,
      sampleProduct.description,
      sampleProduct.sku,
      sampleProduct.price,
      sampleProduct.compare_at_price,
      sampleProduct.inventory,
      sampleProduct.status,
      sampleProduct.type,
      sampleProduct.vendor,
      sampleProduct.tags,
      sampleProduct.images,
      sampleProduct.handle
    ];
    const csv = [headersArr, row].map(r => r.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return '"' + cell.replace(/"/g, '""') + '"';
      }
      return cell;
    }).join(',')).join('\r\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=sample-custom-products.csv',
      },
    });
  }

  // If not a sample GET, return 404
  return json({ error: 'Not found' }, { status: 404 });
}; 
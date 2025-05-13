import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';
import { checkSubscriptionQuota, incrementUsage } from '../utils/subscriptionMiddleware.js';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

export const action = async ({ request }) => {
  try {
    // Get authenticated session
    const { session } = await authenticate.admin(request);
    if (!session) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const format = formData.get('format') || 'woocommerce';
    const shop = session.shop;
    const accessToken = session.accessToken;

    // Check subscription and quota
    const quotaCheck = await checkSubscriptionQuota(shop);
    if (quotaCheck.error) {
      return json({ 
        success: false, 
        error: quotaCheck.error,
        upgradeUrl: quotaCheck.upgradeUrl,
        subscription: quotaCheck.subscription
      }, { status: quotaCheck.status });
    }

    // Check if the operation would exceed limits
    const subscription = quotaCheck.subscription;
    const planLimits = subscription.getPlanLimits();
    const currentCount = subscription.exportCount;
    const limit = planLimits.exportLimit;

    if (currentCount >= limit) {
      return json({
        success: false,
        error: 'Export quota exceeded',
        upgradeUrl: `/app/billing?shop=${shop}`,
        subscription: {
          plan: subscription.plan,
          exportCount: currentCount,
          limit,
          remainingExports: 0
        }
      }, { status: 403 });
    }

    // Initialize Shopify API client
    const shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET,
      scopes: process.env.SCOPES.split(','),
      hostName: shop.replace(/https?:\/\//, ''),
      apiVersion: LATEST_API_VERSION,
      isEmbeddedApp: true,
    });

    // Get products from Shopify
    const client = new shopify.clients.Rest({ session });
    const response = await client.get({
      path: 'products',
      query: { limit: 250 }
    });

    if (!response.ok) {
      return json({ success: false, error: 'Failed to fetch products from Shopify' }, { status: 500 });
    }

    const products = response.body.products;

    // Check if the number of products would exceed the limit
    if (currentCount + products.length > limit) {
      return json({
        success: false,
        error: `Export would exceed quota. You can export ${limit - currentCount} more products.`,
        upgradeUrl: `/app/billing?shop=${shop}`,
        subscription: {
          plan: subscription.plan,
          exportCount: currentCount,
          limit,
          remainingExports: limit - currentCount
        }
      }, { status: 403 });
    }

    // Convert products to CSV based on format
    let csvContent;
    switch (format.toLowerCase()) {
      case 'woocommerce':
        csvContent = convertToWooCommerce(products);
        break;
      // Add other format cases here
      default:
        return json({ success: false, error: 'Unsupported export format' }, { status: 400 });
    }

    // Increment usage count after successful export
    await incrementUsage(shop, 'export');

    return json({
      success: true,
      csv: csvContent,
      subscription: {
        plan: subscription.plan,
        exportCount: currentCount + products.length,
        limit,
        remainingExports: limit - (currentCount + products.length)
      }
    });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

function convertToWooCommerce(products) {
  // Add your WooCommerce CSV conversion logic here
  // This is a placeholder implementation
  const headers = ['Type', 'SKU', 'Name', 'Published', 'Featured', 'Catalog visibility', 'Short description', 'Description', 'Date sale price starts', 'Date sale price ends', 'Tax status', 'Tax class', 'In stock?', 'Stock', 'Backorders allowed?', 'Sold individually?', 'Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)', 'Allow customer reviews?', 'Purchase note', 'Sale price', 'Regular price', 'Categories', 'Tags', 'Shipping class', 'Images', 'Download limit', 'Download expiry days', 'Parent', 'Grouped products', 'Upsells', 'Cross-sells', 'External URL', 'Button text', 'Position', 'Attribute 1 name', 'Attribute 1 value(s)', 'Attribute 1 visible', 'Attribute 1 global', 'Attribute 2 name', 'Attribute 2 value(s)', 'Attribute 2 visible', 'Attribute 2 global', 'Meta: _wpcom_is_markdown', 'Download 1 name', 'Download 1 URL', 'Download 2 name', 'Download 2 URL'];
  
  const rows = products.map(product => {
    return [
      'simple', // Type
      product.variants[0]?.sku || '', // SKU
      product.title, // Name
      '1', // Published
      '0', // Featured
      'visible', // Catalog visibility
      '', // Short description
      product.body_html || '', // Description
      '', // Date sale price starts
      '', // Date sale price ends
      'taxable', // Tax status
      '', // Tax class
      '1', // In stock?
      product.variants[0]?.inventory_quantity || '0', // Stock
      '0', // Backorders allowed?
      '0', // Sold individually?
      product.variants[0]?.weight || '', // Weight
      '', // Length
      '', // Width
      '', // Height
      '1', // Allow customer reviews?
      '', // Purchase note
      product.variants[0]?.compare_at_price || '', // Sale price
      product.variants[0]?.price || '', // Regular price
      product.product_type || '', // Categories
      product.tags || '', // Tags
      '', // Shipping class
      product.images.map(img => img.src).join(','), // Images
      '', // Download limit
      '', // Download expiry days
      '', // Parent
      '', // Grouped products
      '', // Upsells
      '', // Cross-sells
      '', // External URL
      '', // Button text
      '0', // Position
      '', // Attribute 1 name
      '', // Attribute 1 value(s)
      '1', // Attribute 1 visible
      '1', // Attribute 1 global
      '', // Attribute 2 name
      '', // Attribute 2 value(s)
      '1', // Attribute 2 visible
      '1', // Attribute 2 global
      '0', // Meta: _wpcom_is_markdown
      '', // Download 1 name
      '', // Download 1 URL
      '', // Download 2 name
      ''  // Download 2 URL
    ];
  });

  return [headers, ...rows].map(row => row.join(',')).join('\n');
} 
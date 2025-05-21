import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { headers, mapProduct, mapToShopify } from '../csv-templates/woocommerce.js';
import { parse } from 'csv-parse/sync';
import { Shop } from '../models/Shop';
import StoreStats from '../models/StoreStats';
import { requireActiveSubscription } from '../utils/subscriptionMiddleware';
import { checkPlanLimits, isPlatformAllowed } from '../utils/planLimits';
import { Subscription } from '../models/subscription.js';
import { convertMetafieldsObjectToArray } from '../utils/productBuilders/shopifyBuilder.js';

// WooCommerce-to-Shopify field mapping
// (now using mapToShopify from the template)

// Shopify-to-Shopify (identity mapping, for demonstration)
function mapShopifyToShopify(row) {
  return {
    title: row['Title'] || row['title'],
    handle: row['Handle'] || row['handle'],
    status: row['Status'] || row['status'] || 'active',
    body_html: row['Body (HTML)'] || row['body_html'] || '',
    vendor: row['Vendor'] || row['vendor'] || '',
    product_type: row['Type'] || row['product_type'] || '',
    tags: row['Tags'] || row['tags'] || '',
    images: row['Image Src'] ? [{ url: row['Image Src'] }] : [],
    variants: [{
      sku: row['Variant SKU'] || '',
      price: row['Variant Price'] || '',
      compare_at_price: row['Variant Compare At Price'] || '',
      inventory_quantity: row['Variant Inventory Qty'] || 0,
      weight: row['Variant Weight'] || '',
    }],
  };
}

function isValidMetafieldArray(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.every(mf =>
    typeof mf === 'object' &&
    typeof mf.namespace === 'string' &&
    typeof mf.key === 'string' &&
    'value' in mf &&
    typeof mf.type === 'string'
  );
}

export const action = async ({ request }) => {
  let admin, session, shopDoc;
  try {
    const { admin: shopifyAdmin, session: shopifySession } = await authenticate.admin(request);
    admin = shopifyAdmin;
    session = shopifySession;
    if (!session?.shop) {
      return json({ success: false, error: 'Please log in to continue' }, { status: 401 });
    }
    if (!admin) {
      return json({ success: false, error: 'No admin access' }, { status: 401 });
    }
    // Find the Shop document by shop domain
    shopDoc = await Shop.findOne({ shop: session.shop });
    console.log('[Import] shopDoc:', shopDoc);
    // Enforce active subscription
    try {
      await requireActiveSubscription(shopDoc._id);
    } catch (err) {
      throw redirect(`/app/billing?shop=${shopDoc._id}`);
    }
  } catch (error) {
    return json({ success: false, error: 'Please log in to continue' }, { status: 401 });
  }

  // Parse the request body
  const formData = await request.formData();
  const file = formData.get('file');
  const format = formData.get('format') || 'shopify';

  if (!file) {
    return json({ success: false, error: 'No file uploaded' }, { status: 400 });
  }

  // Check if the platform is allowed for the shop's plan
  const subscription = await Subscription.findOne({ shopId: shopDoc._id });
  if (!isPlatformAllowed(subscription.plan, format.toUpperCase())) {
    return json({ 
      success: false, 
      error: `Your current plan (${subscription.plan}) does not support importing from ${format}. Please upgrade your plan.`,
      upgradeUrl: `/app/billing?shop=${shopDoc._id}`
    }, { status: 403 });
  }

  // Parse the CSV file
  const csvText = await file.text();
  const products = parseCSV(csvText, format);

  // Check plan limits before proceeding
  const limitCheck = await checkPlanLimits(shopDoc._id, 'import', products.length);
  if (!limitCheck.allowed) {
    return json({
      success: false,
      error: `Import limit exceeded. Your ${limitCheck.plan} plan allows ${limitCheck.limit} imports. You have used ${limitCheck.current} and tried to import ${products.length} more.`,
      details: {
        current: limitCheck.current,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
        plan: limitCheck.plan
      },
      upgradeUrl: `/app/billing?shop=${shopDoc._id}`
    }, { status: 403 });
  }

  // Batch import to Shopify
  const batchSize = 10;
  const results = { success: [], failed: [] };
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchPromises = batch.map(async (product) => {
      try {
        const shopifyProduct = {
          title: product.title || 'Untitled',
          body_html: product.body_html || '',
          vendor: product.vendor || '',
          product_type: product.product_type || '',
          tags: product.tags || '',
          images: product.images || [],
          variants: product.variants.map(variant => ({
            ...variant,
            inventory_management: 'shopify', // Enable inventory tracking
            inventory_policy: variant.inventoryQuantity > 0 ? 'continue' : 'deny', // Set policy based on quantity
            inventory_quantity: parseInt(variant.inventoryQuantity) || 0,
            requires_shipping: true
          })) || [],
        };
        // Always assign and sanitize metafields from the original product
        let metafieldsToCreate = [];
        if ('metafields' in product) {
          if (Array.isArray(product.metafields)) {
            metafieldsToCreate = product.metafields;
          } else {
            metafieldsToCreate = convertMetafieldsObjectToArray(product.metafields);
          }
        }
        // Debug: print the final product object (without metafields)
        console.log('[Shopify Import] Final product object (no metafields):', JSON.stringify(shopifyProduct, null, 2));
        // Create the product (without metafields)
        const response = await admin.rest.resources.Product.create({
          session: admin.session,
          ...shopifyProduct,
        });
        // After product creation, create metafields if any
        if (response && response.id && metafieldsToCreate.length > 0) {
          for (const mf of metafieldsToCreate) {
            try {
              await admin.rest.request({
                path: `/products/${response.id}/metafields`,
                method: 'POST',
                data: { metafield: mf },
                session: admin.session
              });
            } catch (err) {
              console.error(`[Shopify Import] Failed to create metafield for product ${response.id}:`, mf, err);
            }
          }
        }
        if (response && response.id) {
          results.success.push({ product: shopifyProduct, result: response });
        } else {
          results.failed.push({ product: shopifyProduct, error: response?.errors || response });
        }
      } catch (error) {
        results.failed.push({ product, error: error.message });
      }
    });
    await Promise.all(batchPromises);
  }

  // After successful import, update both Shop and StoreStats
  if (session?.shop && products.length > 0) {
    try {
      // Get current store stats
      const currentStats = await StoreStats.findOne({ shopId: shopDoc._id });
      console.log('[Import] Current store stats:', {
        shop: session.shop,
        shopId: shopDoc._id,
        currentStats
      });

      // Update StoreStats
      const updatedStats = await StoreStats.findOneAndUpdate(
        { shopId: shopDoc._id },
        { 
          $inc: { importCount: products.length },
          $setOnInsert: { 
            shopId: shopDoc._id,
          }
        },
        { 
          upsert: true,
          new: true 
        }
      );

      console.log('[Import] Updated store stats:', {
        shop: session.shop,
        shopId: shopDoc._id,
        previousCount: currentStats?.importCount || 0,
        newCount: updatedStats.importCount,
        productsAdded: products.length
      });

      // Also update Shop model for backward compatibility
      await Shop.findByIdAndUpdate(
        shopDoc._id,
        { $inc: { importCount: products.length } },
        { new: true }
      );
    } catch (err) {
      console.error('[Import] Error updating import counts:', err);
    }
  }

  return json({
    success: true,
    results: {
      total: products.length,
      successful: results.success.length,
      failed: results.failed.length,
      details: results,
    },
  });
}; 
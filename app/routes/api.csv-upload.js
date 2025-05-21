import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';
import { incrementUsage, requireActiveSubscription } from '../utils/subscriptionMiddleware.js';
import { shopifyParser } from '../utils/csvParsers/shopifyParser.js';
import { wooCommerceParser } from '../utils/csvParsers/wooCommerceParser.js';
import { wixParser } from '../utils/csvParsers/wixParser.js';
import { bigCommerceParser } from '../utils/csvParsers/bigCommerceParser.js';
import { squarespaceParser } from '../utils/csvParsers/squarespaceParser.js';
import { amazonParser } from '../utils/csvParsers/amazonParser.js';
import { alibabaParser } from '../utils/csvParsers/alibabaParser.js';
import { customSheetParser } from '../utils/csvParsers/customSheetParser.js';
import { aliExpressParser } from '../utils/csvParsers/aliExpressParser.js';
import { etsyParser } from '../utils/csvParsers/etsyParser.js';
import { ebayParser } from '../utils/csvParsers/ebayParser.js';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import { Shop } from '../models/Shop.js';
import StoreStats from '../models/StoreStats.js';
import { buildShopifyProductFromShopifyCSV } from '../utils/productBuilders/shopifyBuilder.js';
import { buildShopifyProductFromWooCommerceCSV } from '../utils/productBuilders/wooCommerceBuilder.js';
import { buildShopifyProductFromWixCSV } from '../utils/productBuilders/wixBuilder.js';
import { buildShopifyProductFromBigCommerceCSV } from '../utils/productBuilders/bigCommerceBuilder.js';
import { buildShopifyProductFromSquarespaceCSV } from '../utils/productBuilders/squarespaceBuilder.js';
import { buildShopifyProductFromAmazonCSV } from '../utils/productBuilders/amazonBuilder.js';
import { buildShopifyProductFromAlibabaCSV } from '../utils/productBuilders/alibabaBuilder.js';
import { buildShopifyProductFromCustomCSV } from '../utils/productBuilders/customBuilder.js';
import { buildShopifyProductFromAliExpressCSV } from '../utils/productBuilders/aliExpressBuilder.js';
import { buildShopifyProductFromEtsyCSV } from '../utils/productBuilders/etsyBuilder.js';
import { buildShopifyProductFromEbayCSV } from '../utils/productBuilders/ebayBuilder.js';
import ImportIssue from '../models/ImportIssue.js';
import { walmartParser } from '../utils/csvParsers/walmartParser.js';
import { buildShopifyProductFromWalmartCSV } from '../utils/productBuilders/walmartBuilder.js';

// Shopify API setup (replace with your actual credentials or use env vars)
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_API_SCOPES?.split(',') ,
  hostName: process.env.HOST?.replace(/https?:\/\//, '') || 'localhost',
  apiVersion: '2024-04',
  isEmbeddedApp: true,
  future: {
    lineItemBilling: true,
    unstable_managedPricingSupport: true,
    customerAddressDefaultFix: true
  }
});

export const action = async ({ request }) => {
  let subscription = null;
  try {
    // Get authenticated session
    const { session } = await authenticate.admin(request);
    console.log('[Shopify Import] Full session:', session);
    console.log('[Shopify Import] Session scopes:', session?.scope || session?.scopes);
    console.log('[Shopify Import] Access token:', session?.accessToken);
    
    // Check for required scopes
    // const requiredScopes = ['read_product_listings', 'read_products', 'write_products'];
    // const sessionScopes = (session?.scope || session?.scopes || '').split(',');
    // const missingScopes = requiredScopes.filter(scope => !sessionScopes.includes(scope));
    // if (missingScopes.length > 0) {
    //   return json({
    //     success: false,
    //     error: `Missing required Shopify scopes: ${missingScopes.join(', ')}. Please re-authenticate the app.`
    //   }, { status: 401 });
    // }

    if (!session) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('csv');
    const format = formData.get('format') || 'woocommerce';
    const fieldMapping = formData.get('fieldMapping');
    const shop = session.shop;
    const accessToken = session.accessToken;
    const importId = formData.get('importId');

    // First find the shop to get its ID
    const shopDoc = await Shop.findOne({ shop });
    if (!shopDoc) {
      return json({ success: false, error: 'Shop not found' }, { status: 404 });
    }

    // Check for active subscription
    try {
      subscription = await requireActiveSubscription(shopDoc._id);
    } catch (error) {
      return json({
        success: false,
        error: error.message,
        upgradeUrl: `/app/billing?shop=${shop}`
      }, { status: error.status || 402 });
    }

    // Get plan limits
    const planLimits = subscription.getPlanLimits();
    const currentCount = subscription.importCount;
    const limit = planLimits.importLimit;

    if (currentCount >= limit) {
      return json({
        success: false,
        error: 'Import quota exceeded',
        upgradeUrl: `/app/billing?shop=${shop}`,
        subscription: {
          plan: subscription.plan,
          importCount: currentCount,
          limit,
          remainingImports: 0
        }
      }, { status: 403 });
    }

    if (!file || typeof file === 'string') {
      return json({
        success: false,
        error: 'No CSV file uploaded',
        subscription: {
          plan: subscription.plan,
          importCount: currentCount,
          limit,
          remainingImports: limit - currentCount
        }
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const csvText = Buffer.from(arrayBuffer).toString('utf-8');

    let products;
    try {
      switch (format.toLowerCase()) {
        case 'shopify':
          const parseResult = await shopifyParser.parseCSV(csvText, { shop }, accessToken);
          products = Array.isArray(parseResult) ? parseResult : (parseResult.products || []);
          if (!Array.isArray(products)) {
            return json({
              success: false,
              error: 'Failed to parse products: No products array returned from parser.',
              subscription: {
                plan: subscription.plan,
                importCount: currentCount,
                limit,
                remainingImports: limit - currentCount
              }
            }, { status: 400 });
          }
          break;
        case 'woocommerce':
          products = await wooCommerceParser.parseCSV(csvText);
          break;
        case 'wix':
          products = await wixParser.parseCSV(csvText);
          break;
        case 'bigcommerce':
          products = await bigCommerceParser.parseCSV(csvText);
          break;
        case 'squarespace':
          products = await squarespaceParser.parseCSV(csvText);
          break;
        case 'amazon':
          products = await amazonParser.parseCSV(csvText);
          break;
        case 'alibaba':
          products = await alibabaParser.parseCSV(csvText);
          break;
        case 'customcsv':
          products = await customSheetParser.parseCSV(csvText, fieldMapping);
          break;
        case 'aliexpress':
          products = await aliExpressParser.parseCSV(csvText);
          break;
        case 'etsy':
          products = await etsyParser.parseCSV(csvText);
          break;
        case 'ebay':
          products = await ebayParser.parseCSV(csvText);
          break;
        case 'walmart':
          products = await walmartParser.parseCSV(csvText);
          break;
        default:
          return json({
            success: false,
            error: 'Invalid CSV format specified',
            subscription: {
              plan: subscription.plan,
              importCount: currentCount,
              limit,
              remainingImports: limit - currentCount
            }
          }, { status: 400 });
      }
    } catch (error) {
      return json({
        success: false,
        error: `Failed to parse CSV: ${error.message}`,
        subscription: {
          plan: subscription.plan,
          importCount: currentCount,
          limit,
          remainingImports: limit - currentCount
        }
      }, { status: 400 });
    }

    // Log the number of products to import
    console.log('Number of products to import:', products.length);

    if (currentCount + products.length > limit) {
      const remainingSlots = limit - currentCount;
      const excessProducts = products.length - remainingSlots;

      let errorMessage;
      if (remainingSlots === 0) {
        errorMessage = 'Your import quota has been reached. Please upgrade your plan to import more products.';
      } else if (remainingSlots < products.length) {
        errorMessage = `Your current plan allows importing ${remainingSlots} more products, but your file contains ${products.length} products. Please either reduce the number of products in your file or upgrade your plan.`;
      } else {
        errorMessage = `Import would exceed quota. You can import ${remainingSlots} more products.`;
      }

      return json({
        success: false,
        error: errorMessage,
        upgradeUrl: `/app/billing?shop=${shop}`,
        subscription: {
          plan: subscription.plan,
          importCount: currentCount,
          limit,
          remainingImports: remainingSlots,
          details: {
            fileProducts: products.length,
            excessProducts,
            canImport: remainingSlots
          }
        }
      }, { status: 403 });
    }

    // Use the authenticated session values instead of env vars
    const shopEnv = shop;
    if (!shopEnv || !accessToken) {
      return json({
        success: false,
        error: 'Shopify credentials missing',
        subscription: {
          plan: subscription.plan,
          importCount: currentCount,
          limit,
          remainingImports: limit - currentCount
        }
      }, { status: 500 });
    }

    // Fetch allowed metafield definitions for products (with pagination and debug logging)
    let allowedMetafields = new Set();
    try {
      let metafieldDefinitions = [];
      let url = `https://${shopEnv}/admin/api/2024-04/metafield_definitions.json?owner_type=PRODUCT&limit=250`;
      console.log('[Shopify Import] Fetching metafield definitions from:', url);
      console.log('[Shopify Import] Using access token:', accessToken ? accessToken.slice(0, 6) + '...' : 'none');
      console.log('[Shopify Import] Session scopes:', session?.scope || session?.scopes);
      do {
        const defsRes = await fetch(url, {
          headers: { 'X-Shopify-Access-Token': accessToken }
        });
        console.log('[Shopify Import] Metafield definitions response status:', defsRes.status);
        const defsJson = await defsRes.json();
        if (defsRes.status === 404) {
          console.error('[Shopify Import] ERROR: Metafield definitions endpoint returned 404. This usually means your app does not have the required access scopes or the endpoint is not available for your API version/store.');
        }
        // Debug: log the full response for the first page
        if (metafieldDefinitions.length === 0) {
          console.log('[Shopify Import] Full metafield_definitions API response:', JSON.stringify(defsJson, null, 2));
        }
        if (defsJson.metafield_definitions) {
          metafieldDefinitions = metafieldDefinitions.concat(defsJson.metafield_definitions);
        }
        // Check for pagination (Shopify uses Link header for pagination)
        const linkHeader = defsRes.headers.get('link');
        if (linkHeader && linkHeader.includes('rel="next"')) {
          // Extract next page URL from Link header
          const match = linkHeader.match(/<([^>]+)>; rel="next"/);
          url = match ? match[1] : null;
        } else {
          url = null;
        }
      } while (url);
      metafieldDefinitions.forEach(def => {
        allowedMetafields.add(`${def.namespace}:${def.key}`);
      });
      // Log allowed metafields for debugging
      console.log('[Shopify Import] Allowed metafields:', Array.from(allowedMetafields));
    } catch (err) {
      console.warn('[Shopify Import] Could not fetch metafield definitions:', err);
    }

    // Batch processing
    const batchSize = 10;
    const results = { success: [], failed: [] };
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      for (let j = 0; j < batch.length; j++) {
        const product = batch[j];
        // Log each product before upload
        // console.log('[Preparing to upload product]', JSON.stringify(product, null, 2));
        try { 
          // Use builder based on format
          let shopifyProduct;
          switch (format.toLowerCase()) {
            case 'shopify':
              shopifyProduct = buildShopifyProductFromShopifyCSV(product);
              break;
            case 'woocommerce':
              shopifyProduct = buildShopifyProductFromWooCommerceCSV(product);
              break;
            case 'wix':
              shopifyProduct = buildShopifyProductFromWixCSV(product);
              break;
            case 'bigcommerce':
              shopifyProduct = buildShopifyProductFromBigCommerceCSV(product);
              break;
            case 'squarespace':
              shopifyProduct = buildShopifyProductFromSquarespaceCSV(product);
              break;
            case 'amazon':
              shopifyProduct = buildShopifyProductFromAmazonCSV(product);
              break;
            case 'alibaba':
              shopifyProduct = buildShopifyProductFromAlibabaCSV(product);
              break;
            case 'customcsv':
              shopifyProduct = buildShopifyProductFromCustomCSV(product, fieldMapping);
              break;
            case 'aliexpress':
              shopifyProduct = buildShopifyProductFromAliExpressCSV(product);
              break;
            case 'etsy':
              shopifyProduct = buildShopifyProductFromEtsyCSV(product);
              break;
            case 'ebay':
              shopifyProduct = buildShopifyProductFromEbayCSV(product);
              break;
            case 'walmart':
              shopifyProduct = buildShopifyProductFromWalmartCSV(product);
              break;
            default:
              results.failed.push({ product, error: 'Invalid CSV format for builder' });
              continue;
          }

          // Universal validation for all formats
          const requiredFields = ['title', 'variants'];
          const missingFields = requiredFields.filter(f => !shopifyProduct[f] || (Array.isArray(shopifyProduct[f]) && !shopifyProduct[f].length));
          if (missingFields.length > 0) {
            results.failed.push({
              product: shopifyProduct,
              error: `Missing required fields: ${missingFields.join(', ')}`
            });
            continue;
          }

          // Only set variants/images/status if not already set by the builder
          if (!shopifyProduct.variants || !shopifyProduct.variants.length) {
            // fallback: do nothing or set a default variant if needed
          }
          if (!shopifyProduct.images) {
            shopifyProduct.images = product.images || [];
          }
          if (!shopifyProduct.status) {
            shopifyProduct.status = 'active';
          }

          let response, result;
          try {
            response = await fetch(`https://${shopEnv}/admin/api/2024-04/products.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
              },
              body: JSON.stringify({ product: shopifyProduct }),
            });
            result = await response.json();

            // After product creation, create metafields if present and allowed
            if (response.ok && result.product && Array.isArray(shopifyProduct.metafields) && shopifyProduct.metafields.length > 0) {
              // Log product ID and shop domain
              console.log('[Shopify Import] Creating metafields for product ID:', result.product.id, 'on shop:', shopEnv);
              // Filter metafields to only those allowed by Shopify and with non-empty values
              const filteredMetafields = shopifyProduct.metafields.filter(mf =>
                allowedMetafields.has(`${mf.namespace}:${mf.key}`) &&
                mf.value !== undefined &&
                mf.value !== null &&
                String(mf.value).trim() !== ''
              );
              // Log skipped metafields for debugging
              shopifyProduct.metafields.forEach(mf => {
                if (!allowedMetafields.has(`${mf.namespace}:${mf.key}`)) {
                  console.log('[Shopify Import] Skipping undefined metafield:', mf.namespace, mf.key, '| Value:', mf.value);
                } else if (mf.value === undefined || mf.value === null || String(mf.value).trim() === '') {
                  console.log('[Shopify Import] Skipping empty metafield:', mf.namespace, mf.key, '| Value:', mf.value);
                }
              });
              // Only create allowed, non-empty metafields
              for (const metafield of filteredMetafields) {
                try {
                  // Ensure metafield payload matches Shopify's required structure
                  const metafieldPayload = {
                    metafield: {
                      namespace: metafield.namespace,
                      key: metafield.key,
                      value: metafield.value,
                      type: metafield.type || 'single_line_text_field',
                    }
                  };
                  console.log('[Shopify Import] Sending metafield payload:', JSON.stringify(metafieldPayload));
                  const mfRes = await fetch(`https://${shopEnv}/admin/api/2024-04/products/${result.product.id}/metafields.json`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Shopify-Access-Token': accessToken,
                    },
                    body: JSON.stringify(metafieldPayload)
                  });
                  const mfResult = await mfRes.json();
                  if (!mfRes.ok) {
                    console.warn('[Shopify Import] Failed to create metafield:', metafieldPayload, '| Shopify response:', JSON.stringify(mfResult));
                    // Add error to results.failed for user feedback
                    results.failed.push({ product: shopifyProduct, metafield: metafieldPayload, error: mfResult.errors || mfResult });
                  }
                } catch (mfErr) {
                  console.warn('[Shopify Import] Error creating metafield:', metafield, mfErr);
                  results.failed.push({ product: shopifyProduct, metafield, error: mfErr.message });
                }
              }
            }
          } catch (apiError) {
            results.failed.push({ product: shopifyProduct, error: `API error: ${apiError.message}` });
            continue;
          }

          // Log the uploaded product payload and Shopify's response
          console.log('[Uploaded Product Payload]', JSON.stringify(shopifyProduct, null, 2));
          console.log('[Shopify API Response]', JSON.stringify(result, null, 2));

          // Success check and push to results.success or results.failed
          if (response.ok && (result.product || result.id || (result.products && result.products.length > 0))) {
            results.success.push({ product: shopifyProduct, result: result.product || result });
          } else {
            results.failed.push({ product: shopifyProduct, error: result.errors || result });
          }

          // Handle collections/categories
          if (product.collections && Array.isArray(product.collections)) {
            for (const collectionPath of product.collections) {
              try {
                // Split the collection path into parts
                const parts = collectionPath.split(' / ');
                let parentId = null;

                // Create each level of the collection hierarchy
                for (let i = 0; i < parts.length; i++) {
                  const collectionTitle = parts[i];

                  // Check if collection exists
                  const searchResponse = await fetch(
                    `https://${shopEnv}/admin/api/2024-04/custom_collections.json?title=${encodeURIComponent(collectionTitle)}`,
                    {
                      headers: {
                        'X-Shopify-Access-Token': accessToken,
                      }
                    }
                  );

                  const searchResult = await searchResponse.json();
                  let collectionId;

                  if (searchResult.custom_collections && searchResult.custom_collections.length > 0) {
                    collectionId = searchResult.custom_collections[0].id;
                  } else {
                    // Create new collection
                    const createResponse = await fetch(
                      `https://${shopEnv}/admin/api/2024-04/custom_collections.json`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'X-Shopify-Access-Token': accessToken,
                        },
                        body: JSON.stringify({
                          custom_collection: {
                            title: collectionTitle,
                            published: true
                          }
                        })
                      }
                    );

                    const createResult = await createResponse.json();
                    collectionId = createResult.custom_collection.id;
                  }

                  // Add product to collection
                  await fetch(
                    `https://${shopEnv}/admin/api/2024-04/collects.json`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': accessToken,
                      },
                      body: JSON.stringify({
                        collect: {
                          product_id: result.product.id,
                          collection_id: collectionId
                        }
                      })
                    }
                  );

                  parentId = collectionId;
                }
              } catch (error) {
              }
            }
          }

          // Now upload images to the created product
          // if (product.images && Array.isArray(product.images)) {
          //   for (const image of product.images) {
          //     if (image.src) {
          //       const shopifyImageUrl = await uploadImageToShopify(image.src);
          //       if (shopifyImageUrl) {
          //       }
          //     }
          //   }
          // }

          if (response.ok && (result.product || result.id || (result.products && result.products.length > 0))) {
            try {
              // Increment usage count after successful import
              await incrementUsage(shopDoc._id, 'import');

              // Update StoreStats
              const storeStats = await StoreStats.findOneAndUpdate(
                { shopId: shopDoc._id },
                { 
                  $inc: { importCount: 1 },
                  $setOnInsert: { 
                    shopId: shopDoc._id,
                    platformUsage: { import: new Map(), export: new Map() }
                  }
                },
                { 
                  upsert: true,
                  new: true 
                }
              );
            } catch (error) {
            }
          }
        } catch (error) {
          results.failed.push({ product, error: error.message });
        }
      }
    }

    // Log ImportExportEvent for successful imports
    try {
      if (results.success.length > 0) {
        const ImportExportEvent = (await import('../models/ImportExportEvent.js')).default;
        await ImportExportEvent.create({
          shopId: shopDoc._id,
          type: 'import',
          count: results.success.length,
          date: new Date(),
          platform: format
        });
      }
    } catch (eventErr) {
    }

    // After processing all products, store issues for failed/skipped products
    if (importId) {
      const failedIssues = results.failed.map(f => ({
        importId,
        productName: f.product?.title || 'Unknown',
        details: typeof f.error === 'string' ? f.error : JSON.stringify(f.error)
      }));
      if (failedIssues.length > 0) {
        await ImportIssue.insertMany(failedIssues);
        // Update the issuesCount in ImportHistory
        const ImportHistory = (await import('../models/ImportHistory.js')).default;
        await ImportHistory.findByIdAndUpdate(importId, { issuesCount: failedIssues.length });
      }
    }

    // After parsing, if no products are found, create issues for each row
    if ((!products || products.length === 0) && importId) {
      const csvRows = csvText.split('\n').slice(1); // skip header
      const failedIssues = csvRows
        .filter(row => row.trim() !== '')
        .map((row, idx) => ({
          importId,
          productName: `Row ${idx + 2}`,
          details: `Row could not be parsed or is missing required fields. Row content: ${row}`
        }));
      if (failedIssues.length > 0) {
        await ImportIssue.insertMany(failedIssues);
        const ImportHistory = (await import('../models/ImportHistory.js')).default;
        await ImportHistory.findByIdAndUpdate(importId, { issuesCount: failedIssues.length });
      }
      return json({
        success: false,
        error: 'No valid products found in CSV. All rows failed validation.',
        issues: failedIssues.length
      });
    }

    // Log all imported product data after processing

    return json({
      success: true,
      results: {
        total: products.length,
        successful: results.success.length,
        failed: results.failed.length,
        details: results
      },
      subscription: {
        plan: subscription.plan,
        importCount: currentCount + results.success.length,
        limit,
        remainingImports: limit - (currentCount + results.success.length)
      },
      message: `Successfully imported products!`
    });
  } catch (error) {
    // If importId exists, store a general failure issue
    if (importId) {
      const ImportIssue = (await import('../models/ImportIssue.js')).default;
      await ImportIssue.create({
        importId,
        productName: 'Import Failed',
        details: error.message || 'Unknown error during import.'
      });
      const ImportHistory = (await import('../models/ImportHistory.js')).default;
      await ImportHistory.findByIdAndUpdate(importId, { issuesCount: 1 });
    }
    return json({ success: false, error: error.message || 'Import failed.' }, { status: 500 });
  }
};

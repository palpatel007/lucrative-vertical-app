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

// Shopify API setup (replace with your actual credentials or use env vars)
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_API_SCOPES?.split(',') || ['write_products'],
  hostName: process.env.HOST?.replace(/https?:\/\//, '') || 'localhost',
  apiVersion: LATEST_API_VERSION,
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
    if (!session) {
      return json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('csv');
    const format = formData.get('format') || 'woocommerce';
    const fieldMapping = formData.get('fieldMapping');
    const shop = session.shop;
    const accessToken = session.accessToken;

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

    console.log('[Import] Current limits:', {
      shop,
      plan: subscription.plan,
      currentCount,
      limit,
      remainingImports: limit - currentCount,
      subscriptionDetails: {
        status: subscription.status,
        limits: subscription.limits,
        importCount: subscription.importCount
      }
    });

    if (currentCount >= limit) {
      console.log('[Import] Quota exceeded:', {
        shop,
        currentCount,
        limit,
        remainingImports: 0
      });
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
      console.log('[Import] Starting CSV parsing:', {
        shop,
        format,
        fileSize: csvText.length
      });

      switch (format.toLowerCase()) {
        case 'shopify':
          console.log('[Import] Using Shopify parser');
          const parseResult = await shopifyParser.parseCSV(csvText, { shop }, accessToken);
          products = Array.isArray(parseResult.products) ? parseResult.products : [];
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
      console.error('[Import] CSV parsing error:', {
        shop,
        format,
        error: error.message,
        stack: error.stack
      });
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

    // Log parsed products before processing
    console.log('[Import] Parsed products summary:', {
      shop,
      format,
      totalProducts: products.length,
      productDetails: products.map(p => ({
        handle: p.handle,
        title: p.title,
        variantCount: (p.variants || []).length,
        imageCount: (p.images || []).length,
        status: p.status
      }))
    });

    // Check if the number of products would exceed the limit
    if (currentCount + products.length > limit) {
      const remainingSlots = limit - currentCount;
      const excessProducts = products.length - remainingSlots;
      console.log('[Import] Batch would exceed quota:', {
        shop,
        currentCount,
        batchSize: products.length,
        limit,
        wouldExceedBy: excessProducts,
        remainingImports: remainingSlots
      });

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
    console.log('Shop:', shopEnv, 'Access Token:', accessToken);
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

    // Batch processing
    const batchSize = 10;
    const results = { success: [], failed: [] };
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log('[Import] Processing batch:', {
        shop,
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        startIndex: i,
        endIndex: i + batch.length - 1
      });

      const batchPromises = batch.map(async (product, index) => {
        try {
          console.log('[Import] Processing product:', {
            shop,
            batchNumber: Math.floor(i / batchSize) + 1,
            productIndex: index,
            productTitle: product.title || product.Title,
            hasVariants: product.variants?.length > 0,
            hasImages: product.images?.length > 0
          });

          // Function to upload image to Shopify CDN
          async function uploadImageToShopify(imageUrl) {
            try {
              console.log('Attempting to upload image:', imageUrl);

              // First, fetch the image
              const imageResponse = await fetch(imageUrl);
              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageUrl}`);
              }

              const imageBuffer = await imageResponse.arrayBuffer();
              const base64Image = Buffer.from(imageBuffer).toString('base64');

              // Upload to Shopify using the correct endpoint
              const uploadResponse = await fetch(`https://${shopEnv}/admin/api/${LATEST_API_VERSION}/products/${result.product.id}/images.json`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Shopify-Access-Token': accessToken,
                },
                body: JSON.stringify({
                  image: {
                    attachment: base64Image,
                    filename: `product-image-${Date.now()}.jpg`,
                    position: 1
                  }
                })
              });

              if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Failed to upload image to Shopify: ${errorText}`);
              }

              const uploadResult = await uploadResponse.json();
              console.log('Successfully uploaded image:', uploadResult.image.src);
              return uploadResult.image.src;
            } catch (error) {
              console.error('Error uploading image:', error);
              return null;
            }
          }

          // Enhanced product creation with more fields
          const shopifyProduct = {
            title: product.Title || product.title || 'Untitled',
            body_html: product.Description || product.description || product.Body || product.body_html || '',
            vendor: product.Vendor || product.vendor || '',
            product_type: product.Type || product.product_type || '',
            variants: [
              {
                price: product['Sale price'] || product['Sale Price'] || product.sale_price || product.Sale_price || product.Price || product.price || '0.00',
                compare_at_price: product['Regular price'] || product['Regular Price'] || product.regular_price || product.Regular_price || product['Compare Price'] || product.compare_at_price || '',
                sku: product.SKU || product.sku || '',
                inventory_quantity: product.Quantity || product.quantity || product['Inventory Quantity'] || 0,
                inventory_management: 'shopify',
                inventory_policy: 'deny',
              },
            ],
            status: 'active'
          };

          console.log('[Import] Creating Shopify product:', {
            shop,
            productTitle: shopifyProduct.title,
            variantCount: shopifyProduct.variants.length,
            price: shopifyProduct.variants[0].price,
            sku: shopifyProduct.variants[0].sku
          });

          // First create the product without images
          const response = await fetch(`https://${shopEnv}/admin/api/${LATEST_API_VERSION}/products.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken,
            },
            body: JSON.stringify({ product: shopifyProduct }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[Import] Failed to create product:', {
              shop,
              productTitle: shopifyProduct.title,
              error: errorText
            });
            throw new Error(`Failed to create product: ${errorText}`);
          }

          const result = await response.json();
          console.log('[Import] Product created successfully:', {
            shop,
            productId: result.product.id,
            productTitle: result.product.title,
            variantCount: result.product.variants?.length
          });

          // Handle collections/categories
          if (product.collections && Array.isArray(product.collections)) {
            console.log('Processing collections for product:', product.title);

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
                    `https://${shopEnv}/admin/api/${LATEST_API_VERSION}/custom_collections.json?title=${encodeURIComponent(collectionTitle)}`,
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
                      `https://${shopEnv}/admin/api/${LATEST_API_VERSION}/custom_collections.json`,
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
                    `https://${shopEnv}/admin/api/${LATEST_API_VERSION}/collects.json`,
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
                console.error('Error processing collection:', error);
              }
            }
          }

          // Now upload images to the created product
          if (product.images && Array.isArray(product.images)) {
            console.log('Processing images for product:', product.title);
            let position = 1;

            for (const image of product.images) {
              if (image.src) {
                console.log('Uploading image:', image.src);
                const shopifyImageUrl = await uploadImageToShopify(image.src);
                if (shopifyImageUrl) {
                  position++;
                }
              }
            }
          }

          if (response.ok && result.product) {
            try {
              // Increment usage count after successful import
              await incrementUsage(shopDoc._id, 'import');
              console.log('[Import] Successfully incremented import count for shop:', shopDoc._id);

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
              console.log('[Import] Updated store stats:', {
                shop: shop,
                shopId: shopDoc._id,
                newCount: storeStats.importCount
              });
            } catch (error) {
              console.error('[Import] Error updating counts:', error);
            }
            results.success.push({ product: shopifyProduct, result: result.product });
            console.log('[Import] Product added to success list:', {
              shop,
              productId: result.product.id,
              successCount: results.success.length
            });
          } else {
            results.failed.push({ product: shopifyProduct, error: result.errors || result });
            console.error('[Import] Product added to failed list:', {
              shop,
              productTitle: shopifyProduct.title,
              error: result.errors || result
            });
          }
        } catch (error) {
          results.failed.push({ product, error: error.message });
          console.error('[Import] Product processing error:', {
            shop,
            productTitle: product.title || product.Title,
            error: error.message,
            stack: error.stack
          });
        }
      });
      await Promise.all(batchPromises);
    }

    // Log final results
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
      console.error('[Import] Failed to log ImportExportEvent:', eventErr);
    }
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
      message: `Successfully imported ${results.success.length} products!`
    });
  } catch (error) {
    console.error('[Import] Error:', error);
    return json({ 
      success: false, 
      error: error.message,
      subscription: subscription ? {
        plan: subscription.plan,
        importCount: subscription.importCount,
        limit: subscription.limits?.importLimit,
        remainingImports: subscription.limits?.importLimit - subscription.importCount
      } : null
    }, { status: 500 });
  }
};

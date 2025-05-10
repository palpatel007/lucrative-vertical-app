import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';
import { Subscription } from '../models/subscription.js';
import { checkSubscriptionQuota, incrementUsage } from '../utils/subscriptionMiddleware.js';
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
  try {
    const formData = await request.formData();
    const file = formData.get('csv');
    const format = formData.get('format') || 'woocommerce';
    const fieldMapping = formData.get('fieldMapping');
    const shop = formData.get('shop');

    // Subscription quota check
    const check = await checkSubscriptionQuota(shop);
    if (check.error) {
      return json({ error: check.error, ...check }, { status: check.status });
    }

    if (!file || typeof file === 'string') {
      return json({ success: false, error: 'No CSV file uploaded' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const csvText = Buffer.from(arrayBuffer).toString('utf-8');

    let products;
    switch (format.toLowerCase()) {
      case 'woocommerce':
        products = await wooCommerceParser.parseCSV(csvText);
        break;
      case 'wix':
        products = await wixParser.parseCSV(csvText);
        break;
      case 'shopify':
        products = await shopifyParser.parseCSV(csvText);
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
      case 'customsheet':
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
        return json({ success: false, error: 'Invalid CSV format specified' }, { status: 400 });
    }

    // Get Shopify session (replace with your session logic)
    // For demo: use env vars for shop and access token
    const shopEnv = process.env.SHOPIFY_SHOP;
    const accessToken = process.env.SHOPIFY_ADMIN_TOKEN;
    if (!shopEnv || !accessToken) {
      return json({ success: false, error: 'Shopify credentials missing' }, { status: 500 });
    }

    // Batch processing
    const batchSize = 10;
    const results = { success: [], failed: [] };
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchPromises = batch.map(async (product) => {
        try {
          // Minimal product creation example (customize as needed)
          const shopifyProduct = {
            title: product.Title || product.title || 'Untitled',
            body_html: product.Body || product.body_html || '',
            vendor: product.Vendor || product.vendor || '',
            product_type: product.Type || product.product_type || '',
            variants: [
              {
                price: product.Price || product.price || '0.00',
                sku: product.SKU || product.sku || '',
              },
            ],
          };
          const response = await fetch(`https://${shopEnv}/admin/api/${LATEST_API_VERSION}/products.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken,
            },
            body: JSON.stringify({ product: shopifyProduct }),
          });
          const result = await response.json();
          if (response.ok && result.product) {
            results.success.push({ product: shopifyProduct, result: result.product });
          } else {
            results.failed.push({ product: shopifyProduct, error: result.errors || result });
          }
        } catch (error) {
          results.failed.push({ product, error: error.message });
        }
      });
      await Promise.all(batchPromises);
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
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 
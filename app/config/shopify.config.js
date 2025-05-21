import { LATEST_API_VERSION } from '@shopify/shopify-api';

// Ensure we have a valid app URL
const appUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3000';
const hostName = appUrl.replace(/https?:\/\//, '').split('/')[0]; // Handle potential path components

// Validate the app URL
if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
  throw new Error('SHOPIFY_APP_URL must be a valid URL starting with http:// or https://');
}

export const shopifyConfig = {
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES?.split(',') ,
  hostName,
  appUrl,
  apiVersion: '2024-04',
  isEmbeddedApp: true,
  future: {
    lineItemBilling: true,
    unstable_managedPricingSupport: true,
    customerAddressDefaultFix: true
  }
}; 
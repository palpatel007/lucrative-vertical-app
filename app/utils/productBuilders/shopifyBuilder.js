export function buildShopifyProductFromShopifyCSV(product) {
  return {
    title: product.Title || product.title || 'Untitled',
    body_html: product.Body || product.body_html || '',
    vendor: product.Vendor || product.vendor || '',
    product_type: product.Type || product.product_type || '',
    // variants and images will be set in the main logic
  };
} 
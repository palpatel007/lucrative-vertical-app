export function buildShopifyProductFromAliExpressCSV(product) {
  return {
    title: product.Name || product.title || 'Untitled',
    body_html: product.Description || '',
    vendor: product.Vendor || '',
    product_type: product.Type || '',
    // variants and images will be set in the main logic
  };
} 
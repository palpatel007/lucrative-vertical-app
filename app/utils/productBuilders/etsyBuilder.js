export function buildShopifyProductFromEtsyCSV(product) {
  return {
    title: product.Title || product.title || 'Untitled',
    body_html: product.Description || '',
    vendor: product.ShopName || '',
    product_type: product.Category || '',
    // variants and images will be set in the main logic
  };
} 
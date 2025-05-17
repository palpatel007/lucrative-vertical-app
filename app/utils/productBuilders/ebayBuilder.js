export function buildShopifyProductFromEbayCSV(product) {
  return {
    title: product.Title || product.title || 'Untitled',
    body_html: product.Description || '',
    vendor: product.Seller || '',
    product_type: product.Category || '',
    // variants and images will be set in the main logic
  };
} 
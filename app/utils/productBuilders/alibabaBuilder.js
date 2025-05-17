export function buildShopifyProductFromAlibabaCSV(product) {
  return {
    title: product.Name || product.title || 'Untitled',
    body_html: product.Description || '',
    vendor: product.Supplier || '',
    product_type: product.Type || '',
    // variants and images will be set in the main logic
  };
} 
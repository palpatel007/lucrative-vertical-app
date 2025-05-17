// WooCommerce CSV template and mapping for import/export

export const headers = [
  'ID','Type','SKU','Name','Published','Is featured?','Visibility in catalog','Short description','Description',
  'Date sale price starts','Date sale price ends','Tax status','Tax class','In stock?','Stock','Backorders allowed?',
  'Sold individually?','Weight (kg)','Length (cm)','Width (cm)','Height (cm)','Allow customer reviews?','Purchase note',
  'Sale price','Regular price','Categories','Tags','Shipping class','Images','Download limit','Download expiry days',
  'Parent','Grouped products','Upsells','Cross-sells','External URL','Button text','Position','Attribute 1 name',
  'Attribute 1 value(s)','Attribute 1 visible','Attribute 1 global'
];

// Enhanced mapping: Map Shopify product to WooCommerce CSV row
export const mapProduct = (shopifyProduct) => {
  const variant = shopifyProduct.variants?.[0] || {};
  const images = (shopifyProduct.images || shopifyProduct.image ? [shopifyProduct.image] : [])
    .map(img => img?.src || img?.url || img)
    .filter(Boolean)
    .join(',');
  const categories = shopifyProduct.product_type || shopifyProduct.type || '';
  const tags = Array.isArray(shopifyProduct.tags)
    ? shopifyProduct.tags.join(',')
    : (shopifyProduct.tags || '');
  return [
    '', // ID
    'simple', // Type
    variant.sku || shopifyProduct.handle, // SKU
    shopifyProduct.title, // Name
    (shopifyProduct.status || '').toLowerCase() === 'active' ? '1' : '0', // Published
    '', // Is featured?
    'visible', // Visibility in catalog
    '', // Short description
    shopifyProduct.body_html || shopifyProduct.description || '', // Description
    '', '', // Date sale price starts/ends
    'taxable', // Tax status
    '', // Tax class
    variant.inventory_quantity > 0 ? '1' : '0', // In stock?
    variant.inventory_quantity?.toString() || '0', // Stock
    '', // Backorders allowed?
    '', // Sold individually?
    variant.weight || '', // Weight (kg)
    '', '', '', // Length, Width, Height (cm)
    '', // Allow customer reviews?
    '', // Purchase note
    variant.compare_at_price || '', // Sale price
    variant.price || '', // Regular price
    categories, // Categories
    tags, // Tags
    '', // Shipping class
    images, // Images
    '', '', // Download limit, Download expiry days
    '', // Parent
    '', // Grouped products
    '', // Upsells
    '', // Cross-sells
    '', // External URL
    '', // Button text
    '', // Position
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ];
};

// WooCommerce -> Shopify (for import)
export const mapToShopify = (row) => {
  // Parse stock quantity, defaulting to 0 if invalid
  const stockQuantity = parseInt(row['Stock'] || '0', 10);
  const isInStock = row['In stock?'] === '1';
  
  return {
    title: row['Name'],
    handle: row['SKU'],
    status: row['Published'] === '1' ? 'active' : 'draft',
    body_html: row['Description'],
    vendor: '',
    product_type: row['Categories'] || '',
    tags: row['Tags'] || '',
    images: row['Images'] ? row['Images'].split(',').map(url => ({ url })) : [],
    variants: [{
      sku: row['SKU'],
      price: row['Regular price'] || '',
      compare_at_price: row['Sale price'] || '',
      inventory_quantity: isNaN(stockQuantity) ? 0 : stockQuantity,
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      requires_shipping: true,
      weight: row['Weight (kg)'] || '',
    }],
  };
}; 
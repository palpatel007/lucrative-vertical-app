// Helper to convert metafields object to Shopify array format
function convertMetafieldsObjectToArray(metafieldsObj) {
  if (Array.isArray(metafieldsObj)) return metafieldsObj;
  const metafields = [];
  for (const [column, value] of Object.entries(metafieldsObj || {})) {
    if (value === undefined || value === null || String(value).trim() === '') continue;
    const match = column.match(/product\.metafields\.(\w+)\.(\w+)/);
    if (match) {
      metafields.push({
        namespace: match[1],
        key: match[2],
        value,
        type: 'single_line_text_field'
      });
    } else {
      metafields.push({
        namespace: 'custom',
        key: column.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
        value,
        type: 'single_line_text_field'
      });
    }
  }
  return metafields;
}

export function buildShopifyProductFromShopifyCSV(product) {
  // Always ensure variants is a non-empty array
  let variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) {
    variants = [{
      option1: 'Default Title',
      price: product.price || '0',
      sku: product.sku || '',
      compare_at_price: product.compare_at_price || '',
      inventory_quantity: product.inventory_quantity || 0,
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      requires_shipping: true,
      taxable: true
    }];
  } else {
    variants = variants.map(v => ({
      option1: v.option1 || v.option1_value || 'Default Title',
      price: v.price || product.price || '0',
      sku: v.sku || product.sku || '',
      compare_at_price: v.compare_at_price || product.compare_at_price || '',
      inventory_quantity: v.inventory_quantity || 0,
      inventory_management: v.inventory_management || 'shopify',
      inventory_policy: v.inventory_policy || 'deny',
      requires_shipping: v.requires_shipping !== undefined ? v.requires_shipping : true,
      taxable: v.taxable !== undefined ? v.taxable : true
    }));
  }
  // Metafields: always as array
  let metafields = Array.isArray(product.metafields) ? product.metafields : convertMetafieldsObjectToArray(product.metafields);
  metafields = metafields.filter(mf => mf && mf.value !== undefined && mf.value !== null && String(mf.value).trim() !== '');

  return {
    title: product.title || product.Title || 'Untitled',
    body_html: product.body_html || product.Body || '',
    vendor: product.vendor || product.Vendor || '',
    product_type: product.product_type || product.Type || '',
    tags: product.tags || [],
    images: product.images || [],
    collections: product.collections || [],
    status: product.status || 'active',
    variants,
    options: product.options || [],
    metafields
  };
}

// NOTE: Metafields must have: namespace, key, value, type (e.g., 'single_line_text_field') 
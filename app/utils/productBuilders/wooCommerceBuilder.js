export function buildShopifyProductFromWooCommerceCSV(product) {
    // console.log('RAW PRODUCT:', JSON.stringify(product, null, 2));
    let priceRaw = product['price'];
    let compareAtPriceRaw = product['compareAtPrice'];
    let priceNum = parseFloat(priceRaw);
    let compareAtNum = parseFloat(compareAtPriceRaw);

    let price = '0.00';
    let compare_at_price = '';

    if (!isNaN(priceNum) && !isNaN(compareAtNum)) {
        if (priceNum < compareAtNum) {
            price = priceNum.toString();
            compare_at_price = compareAtNum.toString();
        } else if (compareAtNum < priceNum) {
            price = compareAtNum.toString();
            compare_at_price = priceNum.toString();
        } else {
            price = priceNum.toString();
            compare_at_price = '';
        }
    } else if (!isNaN(priceNum)) {
        price = priceNum.toString();
    } else if (!isNaN(compareAtNum)) {
        price = compareAtNum.toString();
    }

    // console.log('final price', price);
    // console.log('final compare_at_price', compare_at_price);

    return {
        title: product.title || product.Name || 'Untitled',
        body_html: product.description || product.Description || '',
        vendor: product.vendor || product.Vendor || '',
        product_type: product.productType || product.Type || '',
        tags: product.tags || [],
        options: product.options || [],
        images: product.images || [],
        collections: product.collections || [],
        status: product.status ? product.status.toLowerCase() : 'active',
        variants: [
            {
                price,
                compare_at_price,
                sku: product.sku || product.SKU || '',
                barcode: product.barcode || '',
                weight: product.weight || 0,
                weight_unit: 'kg',
                inventory_quantity: parseInt(product.inventoryQuantity || product.Stock || product.Quantity || product.quantity || product['Inventory Quantity'] || '0', 10),
                inventory_management: 'shopify',
                inventory_policy: parseInt(product.Stock || product.Quantity || product.quantity || product['Inventory Quantity'] || '0', 10) > 0 ? 'continue' : 'deny',
                requires_shipping: true
            }
        ]
    };
} 
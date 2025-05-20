import { parse } from 'csv-parse/sync';

export const aliExpressParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            // Helper to generate all combinations of option values
            function cartesian(arr) {
                return arr.reduce((a, b) => a.flatMap(d => b.map(e => [].concat(d, e))));
            }

            return records.map(row => {
                // Title/Description
                const title = row['Product Title'] || 'Untitled';
                const description = row['Product Description'] || '';

                // Category (use only last part for productType)
                const categoryPath = row['Category'] || '';
                const productType = categoryPath.split('>').map(s => s.trim()).filter(Boolean).pop() || '';

                // Vendor/Brand
                const vendor = row['Brand Name'] || '';

                // Price
                const price = parseFloat(row['Price'] || '0') || 0;

                // SKU
                const sku = row['SKU'] || row['Product ID'] || '';

                // Tags (not in sample, but keep for compatibility)
                const tags = (row['Keywords'] || '').split(',').map(t => t.trim()).filter(Boolean);

                // Images
                let imageField = row['Image URL'] || row['Image URLs'] || '';
                let imageUrls = imageField.split(/[;,]/).map(url => url.trim()).filter(url => url && url !== 'null');
                imageUrls = [...new Set(imageUrls)];
                const images = imageUrls.map((src, i) => ({ src, position: i + 1 }));

                // Inventory
                const inventoryQuantity = parseInt(row['Stock'] || '0') || 0;
                const inventoryPolicy = inventoryQuantity > 0 ? 'CONTINUE' : 'DENY';

                // Status (AliExpress doesn't have a direct state in this export, so default to active)
                const status = 'active';

                // Variations (e.g., Color:Black;Blue)
                let options = [];
                let variants = [];
                let variantTitle = sku;
                if (row['Variation'] && row['Variation'].includes(':')) {
                  // Support multiple options in the future: Color:Black;Blue|Size:Small;Large
                  const optionPairs = row['Variation'].split('|').map(pair => pair.trim()).filter(Boolean);
                  const optionNames = [];
                  const optionValuesArr = [];
                  optionPairs.forEach(pair => {
                    const [optionName, optionValuesRaw] = pair.split(':');
                    if (optionName && optionValuesRaw) {
                      const values = optionValuesRaw.split(';').map(v => v.trim()).filter(Boolean);
                      if (values.length > 0) {
                        optionNames.push(optionName);
                        optionValuesArr.push(values);
                      }
                    }
                  });
                  if (optionNames.length > 0) {
                    options = optionNames.map((name, idx) => ({ name, values: optionValuesArr[idx] }));
                    // Generate all combinations
                    const combos = cartesian(optionValuesArr);
                    variants = combos.map(combo => {
                      const variant = {
                        price,
                        sku: sku + '-' + combo.map(v => v.replace(/\s+/g, '-').toLowerCase()).join('-'),
                        inventoryQuantity,
                        inventoryPolicy,
                        inventory_quantity: inventoryQuantity,
                        stock_quantity: inventoryQuantity
                      };
                      combo.forEach((val, idx) => {
                        variant[`option${idx+1}`] = val;
                      });
                      variant.title = combo.join(' / ');
                      return variant;
                    });
                  }
                }
                // Safeguard: If options exist but variants is empty, remove options
                if (options.length > 0 && variants.length === 0) {
                  options = [];
                }
                // If no variants were created, create a default variant
                if (variants.length === 0) {
                  variants = [
                    {
                      title: variantTitle || 'Default Title',
                      price,
                      sku,
                      inventoryQuantity,
                      inventoryPolicy,
                      inventory_quantity: inventoryQuantity,
                      stock_quantity: inventoryQuantity,
                      option1: undefined
                    }
                  ];
                }

                // Metafields for extra info
                const metafields = [
                  { key: 'product_id', value: row['Product ID'] || '', namespace: 'aliexpress', type: 'single_line_text_field' },
                  { key: 'shipping_method', value: row['Shipping Method'] || '', namespace: 'aliexpress', type: 'single_line_text_field' },
                  { key: 'shipping_fee', value: row['Shipping Fee'] || '', namespace: 'aliexpress', type: 'single_line_text_field' },
                  { key: 'delivery_time', value: row['Delivery Time (Days)'] || '', namespace: 'aliexpress', type: 'single_line_text_field' },
                  { key: 'condition', value: row['Condition'] || '', namespace: 'aliexpress', type: 'single_line_text_field' }
                ];

                return {
                    productId: row['Product ID'] || '',
                    title,
                    description,
                    productType,
                    vendor,
                    price,
                    sku,
                    tags,
                    images,
                    inventoryQuantity,
                    inventoryPolicy,
                    status,
                    options,
                    variants,
                    shippingMethod: row['Shipping Method'] || '',
                    shippingFee: row['Shipping Fee'] || '',
                    deliveryTime: row['Delivery Time (Days)'] || '',
                    condition: row['Condition'] || '',
                    metafields
                };
            });
        } catch (error) {
            console.error('Error parsing AliExpress CSV:', error);
            throw new Error('Failed to parse AliExpress CSV file');
        }
    }
}; 
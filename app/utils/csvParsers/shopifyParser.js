import { parse } from 'csv-parse/sync';

const STANDARD_SHOPIFY_FIELDS = [
  'Handle','Title','Body (HTML)','Vendor','Product Category','Type','Tags','Published','Option1 Name','Option1 Value','Option1 Linked To','Option2 Name','Option2 Value','Option2 Linked To','Option3 Name','Option3 Value','Option3 Linked To','Variant SKU','Variant Grams','Variant Inventory Tracker','Variant Inventory Qty','Variant Inventory Policy','Variant Fulfillment Service','Variant Price','Variant Compare At Price','Variant Requires Shipping','Variant Taxable','Variant Barcode','Image Src','Image Position','Image Alt Text','Gift Card','SEO Title','SEO Description','Google Shopping / Google Product Category','Google Shopping / Gender','Google Shopping / Age Group','Google Shopping / MPN','Google Shopping / Condition','Google Shopping / Custom Product','Google Shopping / Custom Label 0','Google Shopping / Custom Label 1','Google Shopping / Custom Label 2','Google Shopping / Custom Label 3','Google Shopping / Custom Label 4','Ring Center Stone Clarity (product.metafields.custom.ring_center_stone_clarity)','Ring Center Stone Color (product.metafields.custom.ring_center_stone_color)','Ring Center Stone Shape (product.metafields.custom.ring_center_stone_shape)','Ring Center Stone Type (product.metafields.custom.ring_center_stone_type)','Ring Center Stone Weight (product.metafields.custom.ring_center_stone_weight)','Ring Features Comfort-fit (product.metafields.custom.ring_features_comfort_fit)','Ring Features Resizable (product.metafields.custom.ring_features_resizable)','Ring Height (product.metafields.custom.ring_height)','Ring Side Stone Clarity (product.metafields.custom.ring_side_stone_clarity)','Ring Side Stone Color (product.metafields.custom.ring_side_stone_color)','Ring Side Stone Measurement (product.metafields.custom.ring_side_stone_measurement)','Ring Side Stone Shape (product.metafields.custom.ring_side_stone_shape)','Ring Side Stone Type (product.metafields.custom.ring_side_stone_type)','Ring Side Stone Weight (product.metafields.custom.ring_side_stone_weight)','Ring Width (product.metafields.custom.ring_width)','Age group (product.metafields.shopify.age-group)','Color (product.metafields.shopify.color-pattern)','Jewelry material (product.metafields.shopify.jewelry-material)','Jewelry type (product.metafields.shopify.jewelry-type)','Material (product.metafields.shopify.material)','Ring design (product.metafields.shopify.ring-design)','Ring size (product.metafields.shopify.ring-size)','Target gender (product.metafields.shopify.target-gender)','Watch accessory style (product.metafields.shopify.watch-accessory-style)','Watch display (product.metafields.shopify.watch-display)','Watch features (product.metafields.shopify.watch-features)','Complementary products (product.metafields.shopify--discovery--product_recommendation.complementary_products)','Related products (product.metafields.shopify--discovery--product_recommendation.related_products)','Related products settings (product.metafields.shopify--discovery--product_recommendation.related_products_display)','Search product boosts (product.metafields.shopify--discovery--product_search_boost.queries)','Variant Image','Variant Weight Unit','Variant Tax Code','Cost per item','Status'
];

export const shopifyParser = {
  async parseCSV(csvText) {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    const productMap = new Map();
    for (const row of records) {
      // Normalize all keys to lower case for matching
      const normalizedRow = {};
      Object.keys(row).forEach(k => {
        normalizedRow[k.toLowerCase().trim()] = row[k];
      });
      const handle = normalizedRow['handle'] || '';
      if (!handle) continue;
      let product = productMap.get(handle);
      if (!product) {
        product = {
          handle,
          title: normalizedRow['title'] || 'Untitled',
          body_html: normalizedRow['body (html)'] || '',
          vendor: normalizedRow['vendor'] || '',
          product_type: normalizedRow['type'] || '',
          tags: (normalizedRow['tags'] || '').split(',').map(t => t.trim()).filter(Boolean),
          status: normalizedRow['status'] || 'active',
          images: [],
          variants: [],
          metafields: []
        };
        productMap.set(handle, product);
      }
      // Images
      const imageSrc = normalizedRow['image src'];
      if (imageSrc && !product.images.some(img => img.src === imageSrc)) {
        product.images.push({
          src: imageSrc,
          position: parseInt(normalizedRow['image position'] || '1'),
          alt: normalizedRow['image alt text'] || ''
        });
      }
      // Variants
      const sku = normalizedRow['variant sku'] || '';
      const price = normalizedRow['variant price'] || '';
      const option1 = normalizedRow['option1 value'] || 'Default Title';
      if (sku || price || option1) {
        product.variants.push({
          option1,
          price,
          sku,
          compare_at_price: normalizedRow['variant compare at price'] || '',
          inventory_quantity: parseInt(normalizedRow['variant inventory qty'] || '0'),
          inventory_policy: normalizedRow['variant inventory policy'] || 'deny',
          barcode: normalizedRow['variant barcode'] || ''
        });
      }
      // Metafields
      Object.keys(row).forEach(header => {
        const isMetafieldColumn = /product\.metafields\./i.test(header);
        const isStandard = STANDARD_SHOPIFY_FIELDS.map(f => f.toLowerCase().trim()).includes(header.toLowerCase().trim());
        if (isMetafieldColumn || !isStandard) {
          const value = row[header];
          if (typeof console !== 'undefined' && console.log) {
            console.log(`[ShopifyParser] Considering metafield: header='${header}', value='${value}'`);
          }
          if (value && value !== '') {
            // Try to extract namespace/key
            const match = header.match(/product\.metafields\.(\w+)\.(\w+)/);
            if (match) {
              product.metafields.push({
                namespace: match[1],
                key: match[2],
                value,
                type: 'single_line_text_field'
              });
            } else {
              product.metafields.push({
                namespace: 'custom',
                key: header.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
                value,
                type: 'single_line_text_field'
              });
            }
          }
        }
      });
    }
    // Finalize products
    const products = Array.from(productMap.values()).map(product => {
      // Filter out empty/invalid variants
      product.variants = product.variants.filter(v => {
        return (
          (v.price && v.price.trim() !== '') ||
          (v.sku && v.sku.trim() !== '') ||
          (v.option1 && v.option1.trim() !== '' && v.option1.trim().toLowerCase() !== 'default title')
        );
      });
      // If no variants, create a default variant
      if (!product.variants.length) {
        product.variants = [{
          option1: 'Default Title',
          price: '0',
          sku: '',
          inventory_quantity: 0,
          inventory_policy: 'deny'
        }];
      }
      return product;
    }).filter(product => product.variants && product.variants.length > 0);
    // Debug log
    if (typeof console !== 'undefined' && console.log) {
      console.log(`[ShopifyParser] Parsed products: ${products.length}`);
      if (products.length > 0) {
        console.log('[ShopifyParser] First product:', JSON.stringify(products[0], null, 2));
      }
    }
    return products;
  }
}; 
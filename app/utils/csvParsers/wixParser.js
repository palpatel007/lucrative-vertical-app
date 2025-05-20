import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';

export const wixParser = {
  async parseCSV(csvText) {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const WIX_IMAGE_BASE_URL = "https://static.wixstatic.com/media/";

    return records.map((row, idx) => {
      // Title/Description
      const title = row.name || row.Name || row.title || row['Product Name'] || 'Untitled';
      const description = row.description || row.Description || row['Product Description'] || '';

      // Vendor/Brand
      const brand = row.brand || row.Brand || '';
      const vendor = brand;

      // Price/CompareAtPrice/Discount
      let price = parseFloat(row.price || row.Price || '0') || 0;
      let compareAtPrice = undefined;
      const discountMode = (row.discountMode || '').toUpperCase();
      const discountValue = parseFloat(row.discountValue || '0') || 0;

      if (discountMode === 'PERCENT' && discountValue > 0) {
        compareAtPrice = price;
        price = Math.round((price - (price * discountValue / 100)) * 100) / 100;
      } else if (discountMode === 'AMOUNT' && discountValue > 0) {
        compareAtPrice = price;
        price = Math.round((price - discountValue) * 100) / 100;
      }

      // SKU/Barcode
      const sku = row.sku || row.SKU || '';
      const barcode = row.barcode || row.Barcode || '';

      // Weight
      const weight = parseFloat(row.weight || row.Weight || '0') || 0;
      const weightUnit = (row.weight_unit || row.weightUnit || row.WeightUnit || 'kg').toLowerCase();

      // Inventory
      const inventoryQuantity = parseInt(row.inventory || row.Inventory || '0') || 0;
      const inventoryPolicy = inventoryQuantity > 0 ? 'CONTINUE' : 'DENY';

      // Status
      const visible = (row.visible || row.Visible || '').toString().toLowerCase();
      const status = visible === 'true' || visible === 'yes' || visible === '1' ? 'active' : 'draft';

      // Images (support ; or , as separator)
      let imageField = row.productImageUrl || row.images || row.Images || '';
      let imageUrls = imageField.split(/[;,]/).map(url => url.trim()).filter(url => url && url !== 'null');
      // Deduplicate
      imageUrls = [...new Set(imageUrls)];
      const images = imageUrls.map((src, i) => {
        const url = src.startsWith('http') ? src : WIX_IMAGE_BASE_URL + src;
        return { src: url, position: i + 1 };
      });

      // Collections
      const collections = (row.collection || row.collections || row.Categories || '').split(',').map(c => c.trim()).filter(Boolean);
      // Tags
      const tags = (row.tags || '').split(',').map(t => t.trim()).filter(Boolean);

      // Options/Variants
      const options = [];
      let variantTitle = title;
      for (let i = 1; i <= 6; i++) {
        const name = row[`productOptionName${i}`] || row[`Product Option Name ${i}`] || '';
        const type = row[`productOptionType${i}`] || row[`Product Option Type ${i}`] || '';
        const desc = row[`productOptionDescription${i}`] || row[`Product Option Description ${i}`] || '';
        if (name) {
          // Try to parse values from description (e.g., "Small;Large")
          let values = [];
          if (desc && desc.includes(';')) {
            values = desc.split(';').map(v => v.trim()).filter(Boolean);
          } else if (desc) {
            values = [desc.trim()];
          }
          options.push({ name, type, values });
          if (values.length > 0 && !variantTitle) variantTitle = values[0];
        }
      }
      // Variants (basic: one per product, can be expanded for more complex logic)
      const variants = [
        {
          title: (options[0] && options[0].values && options[0].values[0]) ? options[0].values[0] : title,
          price,
          compareAtPrice,
          sku,
          barcode,
          weight,
          weightUnit,
          inventoryQuantity,
          inventoryPolicy,
          inventory_quantity: inventoryQuantity,
          stock_quantity: inventoryQuantity
        }
      ];

      // Metafields: store extra info
      const metafields = [];
      // Ribbon, surcharge, discount, cost, etc.
      if (row.ribbon) metafields.push({ namespace: 'wix', key: 'ribbon', value: row.ribbon, type: 'single_line_text_field' });
      if (row.surcharge) metafields.push({ namespace: 'wix', key: 'surcharge', value: row.surcharge, type: 'single_line_text_field' });
      if (row.discountMode) metafields.push({ namespace: 'wix', key: 'discountMode', value: row.discountMode, type: 'single_line_text_field' });
      if (row.discountValue) metafields.push({ namespace: 'wix', key: 'discountValue', value: row.discountValue, type: 'single_line_text_field' });
      if (row.cost) metafields.push({ namespace: 'wix', key: 'cost', value: row.cost, type: 'single_line_text_field' });
      // Additional info
      for (let i = 1; i <= 6; i++) {
        if (row[`additionalInfoTitle${i}`] || row[`additionalInfoDescription${i}`]) {
          metafields.push({
            namespace: 'wix',
            key: `additionalInfo${i}`,
            value: `${row[`additionalInfoTitle${i}`] || ''}: ${row[`additionalInfoDescription${i}`] || ''}`.trim(),
            type: 'single_line_text_field'
          });
        }
      }
      // Custom text fields
      for (let i = 1; i <= 2; i++) {
        if (row[`customTextField${i}`]) {
          metafields.push({
            namespace: 'wix',
            key: `customTextField${i}`,
            value: row[`customTextField${i}`],
            type: 'single_line_text_field'
          });
        }
        if (row[`customTextCharLimit${i}`]) {
          metafields.push({
            namespace: 'wix',
            key: `customTextCharLimit${i}`,
            value: row[`customTextCharLimit${i}`],
            type: 'single_line_text_field'
          });
        }
        if (row[`customTextMandatory${i}`]) {
          metafields.push({
            namespace: 'wix',
            key: `customTextMandatory${i}`,
            value: row[`customTextMandatory${i}`],
            type: 'single_line_text_field'
          });
        }
      }

      return {
        title,
        description,
        vendor,
        productType: row.product_type || row.productType || row.Type || '',
        tags,
        collections,
        price,
        compareAtPrice,
        sku,
        barcode,
        weight,
        weightUnit,
        inventoryQuantity,
        inventoryPolicy,
        images,
        status,
        options,
        variants,
        metafields
      };
    });
  },
  async exportToCSV(products) {
    const columns = [
      'handleId','fieldType','name','description','productImageUrl','collection','sku','ribbon','price','surcharge','visible','discountMode','discountValue','inventory','weight','cost','productOptionName1','productOptionType1','productOptionDescription1','productOptionName2','productOptionType2','productOptionDescription2','productOptionName3','productOptionType3','productOptionDescription3','productOptionName4','productOptionType4','productOptionDescription4','productOptionName5','productOptionType5','productOptionDescription5','productOptionName6','productOptionType6','productOptionDescription6','additionalInfoTitle1','additionalInfoDescription1','additionalInfoTitle2','additionalInfoDescription2','additionalInfoTitle3','additionalInfoDescription3','additionalInfoTitle4','additionalInfoDescription4','additionalInfoTitle5','additionalInfoDescription5','additionalInfoTitle6','additionalInfoDescription6','customTextField1','customTextCharLimit1','customTextMandatory1','customTextField2','customTextCharLimit2','customTextMandatory2','brand',''];
    const records = products.map(product => {
      const variant = Array.isArray(product.variants) && product.variants[0] ? product.variants[0] : {};
      // Helper to get option fields
      const getOption = (idx, field) => {
        const option = product.options && product.options[idx-1] ? product.options[idx-1] : {};
        if (field === 'name') return option.name || '';
        if (field === 'type') return option.type || '';
        if (field === 'desc') return Array.isArray(option.values) ? option.values.join(';') : (option.values || '');
        return '';
      };
      // Helper to get additional info fields
      const getAdditionalInfo = (idx, type) => {
        const mf = (product.metafields || []).find(m => m.key === `additionalInfo${idx}`);
        if (!mf) return '';
        if (type === 'title') return (mf.value.split(':')[0] || '').trim();
        if (type === 'desc') return (mf.value.split(':').slice(1).join(':') || '').trim();
        return '';
      };
      // Helper to get custom text fields
      const getCustomText = (idx, key) => {
        const mf = (product.metafields || []).find(m => m.key === `customTextField${idx}` || m.key === `customTextCharLimit${idx}` || m.key === `customTextMandatory${idx}`);
        if (!mf) return '';
        if (key === 'field') return mf.key === `customTextField${idx}` ? mf.value : '';
        if (key === 'limit') return mf.key === `customTextCharLimit${idx}` ? mf.value : '';
        if (key === 'mandatory') return mf.key === `customTextMandatory${idx}` ? mf.value : '';
        return '';
      };
      return {
        handleId: product.handle || '',
        fieldType: 'Product',
        name: product.title || '',
        description: product.description || product.bodyHtml || '',
        productImageUrl: Array.isArray(product.images) ? product.images.map(img => img.src).join(';') : '',
        collection: Array.isArray(product.collections) ? product.collections.join(',') : (product.collections || ''),
        sku: variant.sku || '',
        ribbon: (product.metafields || []).find(m => m.key === 'ribbon')?.value || '',
        price: variant.price || '',
        surcharge: (product.metafields || []).find(m => m.key === 'surcharge')?.value || '',
        visible: product.status === 'active' ? 'TRUE' : 'FALSE',
        discountMode: (product.metafields || []).find(m => m.key === 'discountMode')?.value || '',
        discountValue: (product.metafields || []).find(m => m.key === 'discountValue')?.value || '',
        inventory: variant.inventoryQuantity || '',
        weight: variant.weight || '',
        cost: (product.metafields || []).find(m => m.key === 'cost')?.value || '',
        productOptionName1: getOption(1, 'name'),
        productOptionType1: getOption(1, 'type'),
        productOptionDescription1: getOption(1, 'desc'),
        productOptionName2: getOption(2, 'name'),
        productOptionType2: getOption(2, 'type'),
        productOptionDescription2: getOption(2, 'desc'),
        productOptionName3: getOption(3, 'name'),
        productOptionType3: getOption(3, 'type'),
        productOptionDescription3: getOption(3, 'desc'),
        productOptionName4: getOption(4, 'name'),
        productOptionType4: getOption(4, 'type'),
        productOptionDescription4: getOption(4, 'desc'),
        productOptionName5: getOption(5, 'name'),
        productOptionType5: getOption(5, 'type'),
        productOptionDescription5: getOption(5, 'desc'),
        productOptionName6: getOption(6, 'name'),
        productOptionType6: getOption(6, 'type'),
        productOptionDescription6: getOption(6, 'desc'),
        additionalInfoTitle1: getAdditionalInfo(1, 'title'),
        additionalInfoDescription1: getAdditionalInfo(1, 'desc'),
        additionalInfoTitle2: getAdditionalInfo(2, 'title'),
        additionalInfoDescription2: getAdditionalInfo(2, 'desc'),
        additionalInfoTitle3: getAdditionalInfo(3, 'title'),
        additionalInfoDescription3: getAdditionalInfo(3, 'desc'),
        additionalInfoTitle4: getAdditionalInfo(4, 'title'),
        additionalInfoDescription4: getAdditionalInfo(4, 'desc'),
        additionalInfoTitle5: getAdditionalInfo(5, 'title'),
        additionalInfoDescription5: getAdditionalInfo(5, 'desc'),
        additionalInfoTitle6: getAdditionalInfo(6, 'title'),
        additionalInfoDescription6: getAdditionalInfo(6, 'desc'),
        customTextField1: getCustomText(1, 'field'),
        customTextCharLimit1: getCustomText(1, 'limit'),
        customTextMandatory1: getCustomText(1, 'mandatory'),
        customTextField2: getCustomText(2, 'field'),
        customTextCharLimit2: getCustomText(2, 'limit'),
        customTextMandatory2: getCustomText(2, 'mandatory'),
        brand: product.vendor || '',
        '': '' // for trailing tab
      };
    });
    return new Promise((resolve, reject) => {
      stringify(records, { header: true, columns }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
  }
}; 
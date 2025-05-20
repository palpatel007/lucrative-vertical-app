import { parse } from 'csv-parse/sync';

export const alibabaParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map(row => {
                // Title/Description
                const title = row['Product Name'] || 'Untitled';
                const description = row['Product Description'] || '';

                // Category
                const categoryPath = row['Category'] || '';
                const productType = categoryPath.split('>').map(s => s.trim()).filter(Boolean).pop() || '';

                // Vendor/Brand
                const vendor = row['Brand Name'] || '';

                // Price
                const price = parseFloat(row['Price (USD)'] || '0') || 0;

                // SKU/Model Number
                const sku = row['Model Number'] || row['Product Code'] || '';

                // Tags (not in sample, but keep for compatibility)
                const tags = (row['Keywords'] || '').split(',').map(t => t.trim()).filter(Boolean);

                // Images
                let imageField = row['Main Image URL'] || row['Image URLs'] || '';
                let imageUrls = imageField.split(/[;,]/).map(url => url.trim()).filter(url => url && url !== 'null');
                imageUrls = [...new Set(imageUrls)];
                const images = imageUrls.map((src, i) => ({ src, position: i + 1 }));

                // Inventory (use Supply Ability or MOQ as a proxy)
                const inventoryQuantity = parseInt(row['Supply Ability (per Month)'] || row['MOQ (Minimum Order Quantity)'] || '0') || 0;
                const inventoryPolicy = inventoryQuantity > 0 ? 'CONTINUE' : 'DENY';

                // Status (Alibaba doesn't have a direct state in this export, so default to active)
                const status = 'active';

                // Options (Alibaba sample doesn't have options, but keep for compatibility)
                const options = [];
                let variantTitle = sku;
                // If you add option columns in the future, set variantTitle to the first option value

                // Metafields for extra info
                const metafields = [
                  { key: 'product_id', value: row['Product ID'] || '', namespace: 'alibaba', type: 'single_line_text_field' },
                  { key: 'moq', value: row['MOQ (Minimum Order Quantity)'] || '', namespace: 'alibaba', type: 'single_line_text_field' },
                  { key: 'supply_ability', value: row['Supply Ability (per Month)'] || '', namespace: 'alibaba', type: 'single_line_text_field' },
                  { key: 'packaging_details', value: row['Packaging Details'] || '', namespace: 'alibaba', type: 'single_line_text_field' },
                  { key: 'delivery_time', value: row['Delivery Time'] || '', namespace: 'alibaba', type: 'single_line_text_field' },
                  { key: 'fob_port', value: row['FOB Port'] || '', namespace: 'alibaba', type: 'single_line_text_field' }
                ];

                // Variants (one per product in this structure)
                const variants = [
                    {
                        title: variantTitle || 'Default Title',
                        price,
                        sku,
                        inventoryQuantity,
                        inventoryPolicy,
                        inventory_quantity: inventoryQuantity,
                        stock_quantity: inventoryQuantity
                    }
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
                    moq: row['MOQ (Minimum Order Quantity)'] || '',
                    supplyAbility: row['Supply Ability (per Month)'] || '',
                    packagingDetails: row['Packaging Details'] || '',
                    deliveryTime: row['Delivery Time'] || '',
                    fobPort: row['FOB Port'] || '',
                    metafields
                };
            });
        } catch (error) {
            console.error('Error parsing Alibaba CSV:', error);
            throw new Error('Failed to parse Alibaba CSV file');
        }
    }
}; 
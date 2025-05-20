import { parse } from 'csv-parse/sync';

export const bigCommerceParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map((row, idx) => {
                // Title/Description
                const title = row['Product Name'] || 'Untitled';
                const description = row['Description'] || row['Product Description'] || '';

                // Vendor/Brand
                const vendor = row['Brand Name'] || '';

                // Price
                const price = parseFloat(row['Price'] || '0') || 0;

                // SKU/Barcode
                const sku = row['Product Code/SKU'] || '';
                // No barcode in sample, but keep for compatibility
                const barcode = row['UPC/EAN'] || row['Barcode'] || '';

                // Weight
                const weight = parseFloat(row['Weight'] || '0') || 0;
                const weightUnit = (row['Weight Unit'] || 'kg').toLowerCase();

                // Inventory
                const inventoryQuantity = parseInt(row['Current Stock Level'] || row['Current Stock'] || '0') || 0;
                const inventoryPolicy = inventoryQuantity > 0 ? 'CONTINUE' : 'DENY';

                // Status/Visibility/Availability
                const visible = (row['Visible'] || '').toString().toLowerCase();
                const availability = (row['Availability'] || '').toString().toLowerCase();
                const status = (visible === 'true' && availability === 'available') ? 'active' : 'draft';

                // Images
                let imageField = row['Product Image URL'] || row['Product Images'] || '';
                let imageUrls = imageField.split(/[;,]/).map(url => url.trim()).filter(url => url && url !== 'null');
                imageUrls = [...new Set(imageUrls)];
                const images = imageUrls.map((src, i) => ({ src, position: i + 1 }));

                // Tags/Collections (not in sample, but keep for compatibility)
                const tags = (row['Tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
                const collections = (row['Categories'] || row['Category'] || '').split(',').map(c => c.trim()).filter(Boolean);

                // Options (not in sample, but keep for compatibility)
                const options = [];
                let variantTitle = title;
                if (row['Option1 Name'] && row['Option1 Value']) {
                    options.push({ name: row['Option1 Name'], values: [row['Option1 Value']] });
                    variantTitle = row['Option1 Value'];
                }
                // Variants (basic: one per product, can be expanded for more complex logic)
                const variants = [
                    {
                        title: variantTitle || 'Default Title',
                        price,
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

                return {
                    title,
                    description,
                    vendor,
                    productType: row['Category'] || '',
                    tags,
                    collections,
                    price,
                    sku,
                    barcode,
                    weight,
                    weightUnit,
                    inventoryQuantity,
                    inventoryPolicy,
                    images,
                    status,
                    options,
                    variants
                };
            });
        } catch (error) {
            console.error('Error parsing BigCommerce CSV:', error);
            throw new Error('Failed to parse BigCommerce CSV file');
        }
    }
}; 
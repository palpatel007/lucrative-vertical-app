import { parse } from 'csv-parse/sync';

export const squarespaceParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map((row, idx) => {
                // Handle/Title/Description
                const handle = row['Handle'] || '';
                const title = row['Title'] || row['Product Name'] || 'Untitled';
                const description = row['Body (HTML)'] || row['Description'] || row['Product Description'] || '';

                // Vendor/Brand
                const vendor = row['Vendor'] || row['Brand Name'] || '';

                // Type
                const productType = row['Type'] || row['Category'] || '';

                // Tags
                const tags = (row['Tags'] || '').split(',').map(t => t.trim()).filter(Boolean);

                // Price
                const price = parseFloat(row['Variant Price'] || row['Price'] || '0') || 0;

                // SKU
                const sku = row['Variant SKU'] || row['SKU'] || '';

                // Weight (grams to kg)
                const grams = parseFloat(row['Variant Grams'] || '0') || 0;
                const weight = grams / 1000;
                const weightUnit = 'kg';

                // Inventory
                const inventoryQuantity = parseInt(row['Variant Inventory Qty'] || row['Inventory'] || '0') || 0;
                const inventoryPolicy = inventoryQuantity > 0 ? 'CONTINUE' : 'DENY';

                // Status/Published
                const published = (row['Published'] || '').toString().toLowerCase();
                const status = published === 'true' || published === 'yes' || published === '1' ? 'active' : 'draft';

                // Images (support ; or , as separator)
                let imageField = row['Image Src'] || row['Product Image URL'] || row['Images'] || '';
                let imageUrls = imageField.split(/[;,]/).map(url => url.trim()).filter(url => url && url !== 'null');
                imageUrls = [...new Set(imageUrls)];
                const images = imageUrls.map((src, i) => ({ src, position: i + 1 }));

                // Options
                const options = [];
                let variantTitle = title;
                if (row['Option1 Name'] && row['Option1 Value']) {
                    options.push({ name: row['Option1 Name'], values: [row['Option1 Value']] });
                    variantTitle = row['Option1 Value'];
                }
                // Add more options if needed

                // Variants (one per product in this structure)
                const variants = [
                    {
                        title: variantTitle || 'Default Title',
                        price,
                        sku,
                        weight,
                        weightUnit,
                        inventoryQuantity,
                        inventoryPolicy,
                        inventory_quantity: inventoryQuantity,
                        stock_quantity: inventoryQuantity
                    }
                ];

                return {
                    handle,
                    title,
                    description,
                    vendor,
                    productType,
                    tags,
                    price,
                    sku,
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
            console.error('Error parsing Squarespace CSV:', error);
            throw new Error('Failed to parse Squarespace CSV file');
        }
    }
}; 
import { parse } from 'csv-parse/sync';

export const amazonParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map(record => ({
                title: record['item_name'],
                description: record['product_description'],
                vendor: record['brand_name'],
                productType: record['item_type'],
                tags: record['bullet_point']?.split('|').map(tag => tag.trim()) || [],
                price: parseFloat(record['standard_price']),
                compareAtPrice: parseFloat(record['sale_price']) || null,
                sku: record['seller_sku'],
                barcode: record['external_product_id'],
                weight: parseFloat(record['item_weight']),
                weightUnit: record['item_weight_unit'] || 'KILOGRAMS',
                inventoryQuantity: parseInt(record['quantity'], 10) || 0,
                inventoryPolicy: record['quantity'] > 0 ? 'CONTINUE' : 'DENY',
                images: record['image_url']?.split(',').map(url => ({ src: url.trim() })) || [],
                status: record['item_condition']?.toLowerCase() === 'new' ? 'ACTIVE' : 'DRAFT',
                options: [
                    {
                        name: record['variation_theme'] || 'Size',
                        values: record['size_name']?.split(',').map(value => value.trim()) || []
                    },
                    {
                        name: 'Color',
                        values: record['color_name']?.split(',').map(value => value.trim()) || []
                    }
                ],
                variants: [
                    {
                        title: record['variation_name'] || 'Default',
                        price: parseFloat(record['standard_price']),
                        compareAtPrice: parseFloat(record['sale_price']) || null,
                        sku: record['seller_sku'],
                        barcode: record['external_product_id'],
                        weight: parseFloat(record['item_weight']),
                        weightUnit: record['item_weight_unit'] || 'KILOGRAMS',
                        inventoryQuantity: parseInt(record['quantity'], 10) || 0,
                        inventoryPolicy: record['quantity'] > 0 ? 'CONTINUE' : 'DENY'
                    }
                ]
            }));
        } catch (error) {
            console.error('Error parsing Amazon CSV:', error);
            throw new Error('Failed to parse Amazon CSV file');
        }
    }
}; 
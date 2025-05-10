import { parse } from 'csv-parse/sync';

export const wooCommerceParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map(record => ({
                title: record['Name'],
                description: record['Description'],
                vendor: record['Categories'],
                productType: record['Type'],
                tags: record['Tags']?.split(',').map(tag => tag.trim()) || [],
                price: parseFloat(record['Regular price']),
                compareAtPrice: parseFloat(record['Sale price']) || null,
                sku: record['SKU'],
                barcode: record['Barcode'],
                weight: parseFloat(record['Weight (kg)']),
                weightUnit: 'KILOGRAMS',
                inventoryQuantity: parseInt(record['Stock'], 10) || 0,
                inventoryPolicy: record['Stock status'] === 'instock' ? 'CONTINUE' : 'DENY',
                images: record['Images']?.split(',').map(url => ({ src: url.trim() })) || [],
                status: record['Status']?.toLowerCase() === 'publish' ? 'ACTIVE' : 'DRAFT',
                options: [
                    {
                        name: 'Size',
                        values: record['Size']?.split(',').map(size => size.trim()) || []
                    },
                    {
                        name: 'Color',
                        values: record['Color']?.split(',').map(color => color.trim()) || []
                    }
                ],
                variants: [
                    {
                        title: 'Default',
                        price: parseFloat(record['Regular price']),
                        compareAtPrice: parseFloat(record['Sale price']) || null,
                        sku: record['SKU'],
                        barcode: record['Barcode'],
                        weight: parseFloat(record['Weight (kg)']),
                        weightUnit: 'KILOGRAMS',
                        inventoryQuantity: parseInt(record['Stock'], 10) || 0,
                        inventoryPolicy: record['Stock status'] === 'instock' ? 'CONTINUE' : 'DENY'
                    }
                ]
            }));
        } catch (error) {
            console.error('Error parsing WooCommerce CSV:', error);
            throw new Error('Failed to parse WooCommerce CSV file');
        }
    }
}; 
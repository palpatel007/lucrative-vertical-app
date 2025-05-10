import { parse } from 'csv-parse/sync';

export const aliExpressParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map(record => ({
                title: record['Product Title'],
                description: record['Product Description'],
                vendor: record['Store Name'],
                productType: record['Category'],
                tags: record['Keywords']?.split(',').map(tag => tag.trim()) || [],
                price: parseFloat(record['Price']),
                compareAtPrice: parseFloat(record['Original Price']) || null,
                sku: record['Product ID'],
                barcode: record['Barcode'],
                weight: parseFloat(record['Weight']),
                weightUnit: record['Weight Unit'] || 'KILOGRAMS',
                inventoryQuantity: parseInt(record['Stock'], 10) || 0,
                inventoryPolicy: record['Stock'] > 0 ? 'CONTINUE' : 'DENY',
                images: record['Image URLs']?.split(',').map(url => ({ src: url.trim() })) || [],
                status: record['Status']?.toLowerCase() === 'active' ? 'ACTIVE' : 'DRAFT',
                options: [
                    {
                        name: record['Option Name 1'] || 'Size',
                        values: record['Option Value 1']?.split(',').map(value => value.trim()) || []
                    },
                    {
                        name: record['Option Name 2'] || 'Color',
                        values: record['Option Value 2']?.split(',').map(value => value.trim()) || []
                    }
                ],
                variants: [
                    {
                        title: record['SKU Name'] || 'Default',
                        price: parseFloat(record['Price']),
                        compareAtPrice: parseFloat(record['Original Price']) || null,
                        sku: record['Product ID'],
                        barcode: record['Barcode'],
                        weight: parseFloat(record['Weight']),
                        weightUnit: record['Weight Unit'] || 'KILOGRAMS',
                        inventoryQuantity: parseInt(record['Stock'], 10) || 0,
                        inventoryPolicy: record['Stock'] > 0 ? 'CONTINUE' : 'DENY'
                    }
                ]
            }));
        } catch (error) {
            console.error('Error parsing AliExpress CSV:', error);
            throw new Error('Failed to parse AliExpress CSV file');
        }
    }
}; 
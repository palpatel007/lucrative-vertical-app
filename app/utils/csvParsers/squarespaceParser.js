import { parse } from 'csv-parse/sync';

export const squarespaceParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map(record => ({
                title: record['Product Name'],
                description: record['Product Description'],
                vendor: record['Store Name'],
                productType: record['Category'],
                tags: record['Tags']?.split(',').map(tag => tag.trim()) || [],
                price: parseFloat(record['Price']),
                compareAtPrice: parseFloat(record['Sale Price']) || null,
                sku: record['SKU'],
                barcode: record['Barcode'],
                weight: parseFloat(record['Weight']),
                weightUnit: record['Weight Unit'] || 'KILOGRAMS',
                inventoryQuantity: parseInt(record['Stock'], 10) || 0,
                inventoryPolicy: record['Stock'] > 0 ? 'CONTINUE' : 'DENY',
                images: record['Images']?.split(',').map(url => ({ src: url.trim() })) || [],
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
                        title: record['Variant Name'] || 'Default',
                        price: parseFloat(record['Price']),
                        compareAtPrice: parseFloat(record['Sale Price']) || null,
                        sku: record['SKU'],
                        barcode: record['Barcode'],
                        weight: parseFloat(record['Weight']),
                        weightUnit: record['Weight Unit'] || 'KILOGRAMS',
                        inventoryQuantity: parseInt(record['Stock'], 10) || 0,
                        inventoryPolicy: record['Stock'] > 0 ? 'CONTINUE' : 'DENY'
                    }
                ]
            }));
        } catch (error) {
            console.error('Error parsing Squarespace CSV:', error);
            throw new Error('Failed to parse Squarespace CSV file');
        }
    }
}; 
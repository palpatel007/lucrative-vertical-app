import { parse } from 'csv-parse/sync';

export const ebayParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map(record => ({
                title: record['Title'],
                description: record['Description'],
                vendor: record['Seller Name'],
                productType: record['Category'],
                tags: record['Keywords']?.split(',').map(tag => tag.trim()) || [],
                price: parseFloat(record['Price']),
                compareAtPrice: parseFloat(record['Original Price']) || null,
                sku: record['SKU'],
                barcode: record['UPC/EAN'],
                weight: parseFloat(record['Weight']),
                weightUnit: record['Weight Unit'] || 'KILOGRAMS',
                inventoryQuantity: parseInt(record['Quantity'], 10) || 0,
                inventoryPolicy: record['Quantity'] > 0 ? 'CONTINUE' : 'DENY',
                images: record['Picture URLs']?.split(',').map(url => ({ src: url.trim() })) || [],
                status: record['Status']?.toLowerCase() === 'active' ? 'ACTIVE' : 'DRAFT',
                options: [
                    {
                        name: record['Variation Name 1'] || 'Size',
                        values: record['Variation Value 1']?.split(',').map(value => value.trim()) || []
                    },
                    {
                        name: record['Variation Name 2'] || 'Color',
                        values: record['Variation Value 2']?.split(',').map(value => value.trim()) || []
                    }
                ],
                variants: [
                    {
                        title: record['Variation Name'] || 'Default',
                        price: parseFloat(record['Price']),
                        compareAtPrice: parseFloat(record['Original Price']) || null,
                        sku: record['SKU'],
                        barcode: record['UPC/EAN'],
                        weight: parseFloat(record['Weight']),
                        weightUnit: record['Weight Unit'] || 'KILOGRAMS',
                        inventoryQuantity: parseInt(record['Quantity'], 10) || 0,
                        inventoryPolicy: record['Quantity'] > 0 ? 'CONTINUE' : 'DENY'
                    }
                ]
            }));
        } catch (error) {
            console.error('Error parsing eBay CSV:', error);
            throw new Error('Failed to parse eBay CSV file');
        }
    }
}; 
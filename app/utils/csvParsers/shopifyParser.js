import { parse } from 'csv-parse/sync';

export const shopifyParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map(record => ({
                title: record['Title'],
                description: record['Body (HTML)'],
                vendor: record['Vendor'],
                productType: record['Product Type'],
                tags: record['Tags']?.split(',').map(tag => tag.trim()) || [],
                price: parseFloat(record['Variant Price']),
                compareAtPrice: parseFloat(record['Variant Compare At Price']) || null,
                sku: record['Variant SKU'],
                barcode: record['Variant Barcode'],
                weight: parseFloat(record['Variant Weight']),
                weightUnit: record['Variant Weight Unit'] || 'KILOGRAMS',
                inventoryQuantity: parseInt(record['Variant Inventory Qty'], 10) || 0,
                inventoryPolicy: record['Variant Inventory Policy'] || 'DENY',
                images: record['Image Src']?.split(',').map(url => ({ src: url.trim() })) || [],
                status: record['Status']?.toLowerCase() === 'active' ? 'ACTIVE' : 'DRAFT',
                options: [
                    {
                        name: record['Option1 Name'] || 'Size',
                        values: record['Option1 Value']?.split(',').map(value => value.trim()) || []
                    },
                    {
                        name: record['Option2 Name'] || 'Color',
                        values: record['Option2 Value']?.split(',').map(value => value.trim()) || []
                    }
                ],
                variants: [
                    {
                        title: record['Variant Title'] || 'Default',
                        price: parseFloat(record['Variant Price']),
                        compareAtPrice: parseFloat(record['Variant Compare At Price']) || null,
                        sku: record['Variant SKU'],
                        barcode: record['Variant Barcode'],
                        weight: parseFloat(record['Variant Weight']),
                        weightUnit: record['Variant Weight Unit'] || 'KILOGRAMS',
                        inventoryQuantity: parseInt(record['Variant Inventory Qty'], 10) || 0,
                        inventoryPolicy: record['Variant Inventory Policy'] || 'DENY'
                    }
                ]
            }));
        } catch (error) {
            console.error('Error parsing Shopify CSV:', error);
            throw new Error('Failed to parse Shopify CSV file');
        }
    }
}; 
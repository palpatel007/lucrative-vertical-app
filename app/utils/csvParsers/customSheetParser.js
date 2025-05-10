import { parse } from 'csv-parse/sync';

export const customSheetParser = {
    async parseCSV(csvText, fieldMapping = {}) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            // Default field mappings if none provided
            const defaultMapping = {
                title: 'Title',
                description: 'Description',
                vendor: 'Vendor',
                productType: 'Product Type',
                tags: 'Tags',
                price: 'Price',
                compareAtPrice: 'Compare At Price',
                sku: 'SKU',
                barcode: 'Barcode',
                weight: 'Weight',
                weightUnit: 'Weight Unit',
                inventoryQuantity: 'Inventory Quantity',
                images: 'Images',
                status: 'Status',
                optionName1: 'Option Name 1',
                optionValue1: 'Option Value 1',
                optionName2: 'Option Name 2',
                optionValue2: 'Option Value 2',
                variantTitle: 'Variant Title',
                variantPrice: 'Variant Price',
                variantCompareAtPrice: 'Variant Compare At Price',
                variantSku: 'Variant SKU',
                variantBarcode: 'Variant Barcode',
                variantWeight: 'Variant Weight',
                variantWeightUnit: 'Variant Weight Unit',
                variantInventoryQuantity: 'Variant Inventory Quantity'
            };

            // Merge default mappings with user provided mappings
            const mapping = { ...defaultMapping, ...fieldMapping };

            return records.map(record => {
                // Helper function to safely get and parse values
                const getValue = (field, defaultValue = null) => {
                    const value = record[mapping[field]];
                    if (value === undefined || value === '') return defaultValue;
                    return value;
                };

                // Helper function to parse float values
                const parseFloatValue = (field, defaultValue = null) => {
                    const value = getValue(field);
                    if (value === null) return defaultValue;
                    const parsed = parseFloat(value);
                    return isNaN(parsed) ? defaultValue : parsed;
                };

                // Helper function to parse integer values
                const parseIntValue = (field, defaultValue = 0) => {
                    const value = getValue(field);
                    if (value === null) return defaultValue;
                    const parsed = parseInt(value, 10);
                    return isNaN(parsed) ? defaultValue : parsed;
                };

                // Helper function to parse array values
                const parseArray = (field, defaultValue = []) => {
                    const value = getValue(field);
                    if (value === null) return defaultValue;
                    return value.split(',').map(item => item.trim());
                };

                // Helper function to parse image URLs
                const parseImages = (field) => {
                    const urls = parseArray(field);
                    return urls.map(url => ({ src: url }));
                };

                const baseProduct = {
                    title: getValue('title', 'Untitled Product'),
                    description: getValue('description', ''),
                    vendor: getValue('vendor', ''),
                    productType: getValue('productType', ''),
                    tags: parseArray('tags'),
                    price: parseFloatValue('price', 0),
                    compareAtPrice: parseFloatValue('compareAtPrice'),
                    sku: getValue('sku', ''),
                    barcode: getValue('barcode', ''),
                    weight: parseFloatValue('weight', 0),
                    weightUnit: getValue('weightUnit', 'KILOGRAMS'),
                    inventoryQuantity: parseIntValue('inventoryQuantity'),
                    inventoryPolicy: parseIntValue('inventoryQuantity') > 0 ? 'CONTINUE' : 'DENY',
                    images: parseImages('images'),
                    status: getValue('status', '')?.toLowerCase() === 'active' ? 'ACTIVE' : 'DRAFT',
                    options: [
                        {
                            name: getValue('optionName1', 'Size'),
                            values: parseArray('optionValue1')
                        },
                        {
                            name: getValue('optionName2', 'Color'),
                            values: parseArray('optionValue2')
                        }
                    ],
                    variants: [
                        {
                            title: getValue('variantTitle', 'Default'),
                            price: parseFloatValue('variantPrice', parseFloatValue('price', 0)),
                            compareAtPrice: parseFloatValue('variantCompareAtPrice', parseFloatValue('compareAtPrice')),
                            sku: getValue('variantSku', getValue('sku', '')),
                            barcode: getValue('variantBarcode', getValue('barcode', '')),
                            weight: parseFloatValue('variantWeight', parseFloatValue('weight', 0)),
                            weightUnit: getValue('variantWeightUnit', getValue('weightUnit', 'KILOGRAMS')),
                            inventoryQuantity: parseIntValue('variantInventoryQuantity', parseIntValue('inventoryQuantity')),
                            inventoryPolicy: parseIntValue('variantInventoryQuantity', parseIntValue('inventoryQuantity')) > 0 ? 'CONTINUE' : 'DENY'
                        }
                    ]
                };

                return baseProduct;
            });
        } catch (error) {
            console.error('Error parsing custom CSV:', error);
            throw new Error('Failed to parse custom CSV file');
        }
    }
}; 
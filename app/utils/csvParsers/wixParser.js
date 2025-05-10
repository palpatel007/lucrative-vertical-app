import { parse } from 'csv-parse';

class WixParser {
    static async parseCSV(csvData) {
        return new Promise((resolve, reject) => {
            const products = [];
            
            parse(csvData, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            })
            .on('data', (row) => {
                const product = {
                    title: row['Product Name'],
                    description: row['Description'],
                    price: parseFloat(row['Price']),
                    compareAtPrice: parseFloat(row['Compare at Price']) || null,
                    sku: row['SKU'],
                    barcode: row['Barcode'],
                    weight: parseFloat(row['Weight']) || 0,
                    weightUnit: 'KILOGRAMS',
                    inventoryQuantity: parseInt(row['Inventory']) || 0,
                    images: this.parseImages(row),
                    variants: this.parseVariants(row),
                    status: row['Status'] === 'Published' ? 'ACTIVE' : 'DRAFT',
                    categories: this.parseCategories(row)
                };
                
                products.push(product);
            })
            .on('end', () => {
                resolve(products);
            })
            .on('error', (error) => {
                reject(error);
            });
        });
    }

    static parseImages(row) {
        const images = [];
        const imageUrls = row['Images'].split(',');
        
        imageUrls.forEach(url => {
            if (url.trim()) {
                images.push({
                    src: url.trim(),
                    position: images.length + 1
                });
            }
        });
        
        return images;
    }

    static parseVariants(row) {
        const variants = [];
        
        // Basic variant from main product
        variants.push({
            title: 'Default',
            price: parseFloat(row['Price']),
            compareAtPrice: parseFloat(row['Compare at Price']) || null,
            sku: row['SKU'],
            barcode: row['Barcode'],
            weight: parseFloat(row['Weight']) || 0,
            weightUnit: 'KILOGRAMS',
            inventoryQuantity: parseInt(row['Inventory']) || 0
        });

        return variants;
    }

    static parseCategories(row) {
        if (!row['Categories']) return [];
        return row['Categories'].split(',').map(cat => cat.trim());
    }

    static formatForExport(products) {
        const headers = [
            'Product Name',
            'Description',
            'Price',
            'Compare at Price',
            'SKU',
            'Barcode',
            'Weight',
            'Inventory',
            'Images',
            'Categories',
            'Status'
        ];

        const rows = products.map(product => [
            product.title,
            product.description,
            product.variants[0]?.price || '',
            product.variants[0]?.compareAtPrice || '',
            product.variants[0]?.sku || '',
            product.variants[0]?.barcode || '',
            product.variants[0]?.weight || '',
            product.variants[0]?.inventoryQuantity || '',
            product.images.map(img => img.src).join(','),
            product.categories?.join(',') || '',
            product.status
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}

export default WixParser; 
import { parse } from 'csv-parse';

class CustomParser {
    static async parseCSV(csvData, fieldMapping = null) {
        return new Promise((resolve, reject) => {
            const products = [];
            
            parse(csvData, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            })
            .on('data', (row) => {
                const product = this.mapRowToProduct(row, fieldMapping);
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

    static mapRowToProduct(row, fieldMapping) {
        // Default field mapping if none provided
        const defaultMapping = {
            title: 'title',
            description: 'description',
            price: 'price',
            compareAtPrice: 'compare_at_price',
            sku: 'sku',
            barcode: 'barcode',
            weight: 'weight',
            inventoryQuantity: 'inventory',
            images: 'images',
            categories: 'categories',
            status: 'status'
        };

        const mapping = fieldMapping || defaultMapping;

        const product = {
            title: row[mapping.title] || '',
            description: row[mapping.description] || '',
            price: parseFloat(row[mapping.price]) || 0,
            compareAtPrice: parseFloat(row[mapping.compareAtPrice]) || null,
            sku: row[mapping.sku] || '',
            barcode: row[mapping.barcode] || '',
            weight: parseFloat(row[mapping.weight]) || 0,
            weightUnit: 'KILOGRAMS',
            inventoryQuantity: parseInt(row[mapping.inventoryQuantity]) || 0,
            images: this.parseImages(row[mapping.images]),
            variants: this.parseVariants(row, mapping),
            status: this.parseStatus(row[mapping.status]),
            categories: this.parseCategories(row[mapping.categories])
        };

        return product;
    }

    static parseImages(imagesField) {
        if (!imagesField) return [];
        
        const images = [];
        const imageUrls = imagesField.split(/[,|]/);
        
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

    static parseVariants(row, mapping) {
        const variants = [];
        
        // Basic variant from main product
        variants.push({
            title: 'Default',
            price: parseFloat(row[mapping.price]) || 0,
            compareAtPrice: parseFloat(row[mapping.compareAtPrice]) || null,
            sku: row[mapping.sku] || '',
            barcode: row[mapping.barcode] || '',
            weight: parseFloat(row[mapping.weight]) || 0,
            weightUnit: 'KILOGRAMS',
            inventoryQuantity: parseInt(row[mapping.inventoryQuantity]) || 0
        });

        return variants;
    }

    static parseStatus(status) {
        if (!status) return 'DRAFT';
        
        const statusMap = {
            'active': 'ACTIVE',
            'published': 'ACTIVE',
            'live': 'ACTIVE',
            'draft': 'DRAFT',
            'archived': 'ARCHIVED'
        };

        return statusMap[status.toLowerCase()] || 'DRAFT';
    }

    static parseCategories(categoriesField) {
        if (!categoriesField) return [];
        return categoriesField.split(/[,|]/).map(cat => cat.trim());
    }

    static formatForExport(products, fieldMapping = null) {
        // Default field mapping if none provided
        const defaultMapping = {
            title: 'Title',
            description: 'Description',
            price: 'Price',
            compareAtPrice: 'Compare at Price',
            sku: 'SKU',
            barcode: 'Barcode',
            weight: 'Weight',
            inventoryQuantity: 'Inventory',
            images: 'Images',
            categories: 'Categories',
            status: 'Status'
        };

        const mapping = fieldMapping || defaultMapping;

        const headers = Object.values(mapping);
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

export default CustomParser; 
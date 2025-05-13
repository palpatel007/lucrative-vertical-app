import { parse } from 'csv-parse/sync';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

export const shopifyParser = {
    async parseCSV(csvText, shopInfo, accessToken) {
        const shop = shopInfo?.shop;
        if (!shop || typeof shop !== 'string' || !shop.includes('.')) {
            throw new Error('Missing or invalid shop domain for Shopify API.');
        }
        // Initialize Shopify API client
        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: ['write_products', 'read_products'],
            hostName: (shop || '').replace(/https?:\/\//, ''),
            apiVersion: LATEST_API_VERSION,
            isEmbeddedApp: true,
        });

        const client = new shopify.clients.Rest({
            session: {
                accessToken,
                shop
            }
        });

        // Parse CSV into rows
        const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        const headers = rows[0];
        
        // Group rows by Handle to combine variants
        const productMap = new Map();
        
        console.log('[ShopifyParser] Processing CSV rows:', {
            totalRows: rows.length,
            headers: headers
        });

        // Skip header row and process data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < headers.length) continue; // Skip empty rows

            const title = row[headers.indexOf('Title')] || '';
            const handle = row[headers.indexOf('Handle')] || this.generateHandle(title);
            
            if (!handle) continue;

            if (!productMap.has(handle)) {
                // Create new product
                productMap.set(handle, {
                    handle: handle,
                    title: title,
                    body_html: row[headers.indexOf('Body (HTML)')] || '',
                    vendor: row[headers.indexOf('Vendor')] || '',
                    product_type: row[headers.indexOf('Type')] || '',
                    tags: row[headers.indexOf('Tags')] || '',
                    status: row[headers.indexOf('Status')] || 'active',
                    variants: [],
                    images: []
                });
            }

            const product = productMap.get(handle);
            
            // Add variant
            const variant = {
                option1_name: row[headers.indexOf('Option1 Name')] || '',
                option1_value: row[headers.indexOf('Option1 Value')] || '',
                option2_name: row[headers.indexOf('Option2 Name')] || '',
                option2_value: row[headers.indexOf('Option2 Value')] || '',
                option3_name: row[headers.indexOf('Option3 Name')] || '',
                option3_value: row[headers.indexOf('Option3 Value')] || '',
                sku: row[headers.indexOf('Variant SKU')] || '',
                price: row[headers.indexOf('Variant Price')] || '0.00',
                compare_at_price: row[headers.indexOf('Variant Compare At Price')] || '',
                inventory_quantity: parseInt(row[headers.indexOf('Variant Inventory Qty')] || '0'),
                inventory_policy: row[headers.indexOf('Variant Inventory Policy')] || 'deny',
                barcode: row[headers.indexOf('Variant Barcode')] || ''
            };

            // Add image if present
            const imageSrc = row[headers.indexOf('Image Src')];
            if (imageSrc) {
                const imagePosition = parseInt(row[headers.indexOf('Image Position')] || '1');
                const imageAlt = row[headers.indexOf('Image Alt Text')] || '';
                
                product.images.push({
                    src: imageSrc,
                    position: imagePosition,
                    alt: imageAlt
                });
            }

            product.variants.push(variant);
        }

        const products = Array.from(productMap.values());
        
        // If no products, return empty array and zero counts
        if (!Array.isArray(products) || products.length === 0) {
            return {
                products: [],
                totalProcessed: 0,
                successful: 0,
                failed: 0
            };
        }

        // Use Shopify API to create/update products
        const results = [];
        for (const product of products) {
            if (!product.title || !product.title.trim()) {
                console.warn(`[ShopifyParser] Skipping product with missing title: handle=${product.handle}`);
                results.push({
                    handle: product.handle,
                    title: product.title,
                    status: 'error',
                    error: 'Missing product title'
                });
                continue;
            }
            try {
                // Check if product exists
                const existingProducts = await client.get({
                    path: 'products',
                    query: { handle: product.handle }
                });

                let response;
                if (existingProducts.body.products.length > 0) {
                    // Update existing product
                    const existingProduct = existingProducts.body.products[0];
                    response = await client.put({
                        path: `products/${existingProduct.id}`,
                        data: { product }
                    });
                } else {
                    // Create new product
                    response = await client.post({
                        path: 'products',
                        data: { product }
                    });
                }

                results.push({
                    handle: product.handle,
                    title: product.title,
                    status: 'success',
                    productId: response.body.product.id
                });
            } catch (error) {
                console.error(`Error processing product ${product.handle}:`, error);
                results.push({
                    handle: product.handle,
                    title: product.title,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return {
            products: results,
            totalProcessed: results.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'error').length
        };
    },

    async exportProducts(shop, accessToken) {
        // Initialize Shopify API client
        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: ['read_products'],
            hostName: (shop || '').replace(/https?:\/\//, ''),
            apiVersion: LATEST_API_VERSION,
            isEmbeddedApp: true,
        });

        const client = new shopify.clients.Rest({
            session: {
                accessToken,
                shop
            }
        });

        try {
            // Get all products with their variants and images
            const response = await client.get({
                path: 'products',
                query: { limit: 250 } // Get maximum products per page
            });

            const products = response.body.products;
            
            // Shopify CSV headers in the correct order
            const headers = [
                'Handle',
                'Title',
                'Body (HTML)',
                'Vendor',
                'Product Category',
                'Type',
                'Tags',
                'Published',
                'Option1 Name',
                'Option1 Value',
                'Option2 Name',
                'Option2 Value',
                'Option3 Name',
                'Option3 Value',
                'Variant SKU',
                'Variant Grams',
                'Variant Inventory Tracker',
                'Variant Inventory Qty',
                'Variant Inventory Policy',
                'Variant Fulfillment Service',
                'Variant Price',
                'Variant Compare At Price',
                'Variant Requires Shipping',
                'Variant Taxable',
                'Variant Barcode',
                'Image Src',
                'Image Position',
                'Image Alt Text',
                'Gift Card',
                'Google Shopping / Google Product Category',
                'SEO Title',
                'SEO Description',
                'Google Shopping / Gender',
                'Google Shopping / Age Group',
                'Google Shopping / Condition',
                'Google Shopping / Custom Product',
                'Google Shopping / Custom Label 0',
                'Google Shopping / Custom Label 1',
                'Google Shopping / Custom Label 2',
                'Google Shopping / Custom Label 3',
                'Google Shopping / Custom Label 4',
                'Variant Image',
                'Variant Weight Unit',
                'Variant Tax Code',
                'Cost per item',
                'Status'
            ];

            const rows = [headers];

            for (const product of products) {
                const baseProductData = [
                    product.handle || '',
                    product.title || '',
                    product.body_html || '',
                    product.vendor || '',
                    '', // Product Category
                    product.product_type || '',
                    product.tags || '',
                    product.published_at ? 'TRUE' : 'FALSE',
                    '', // Option1 Name (will be filled for variants)
                    '', // Option1 Value
                    '', // Option2 Name
                    '', // Option2 Value
                    '', // Option3 Name
                    '', // Option3 Value
                    '', // Variant SKU
                    '', // Variant Grams
                    '', // Variant Inventory Tracker
                    '', // Variant Inventory Qty
                    '', // Variant Inventory Policy
                    '', // Variant Fulfillment Service
                    '', // Variant Price
                    '', // Variant Compare At Price
                    '', // Variant Requires Shipping
                    '', // Variant Taxable
                    '', // Variant Barcode
                    '', // Image Src
                    '', // Image Position
                    '', // Image Alt Text
                    '', // Gift Card
                    '', // Google Shopping / Google Product Category
                    product.metafields?.seo_title || '',
                    product.metafields?.seo_description || '',
                    '', // Google Shopping / Gender
                    '', // Google Shopping / Age Group
                    '', // Google Shopping / Condition
                    '', // Google Shopping / Custom Product
                    '', // Google Shopping / Custom Label 0
                    '', // Google Shopping / Custom Label 1
                    '', // Google Shopping / Custom Label 2
                    '', // Google Shopping / Custom Label 3
                    '', // Google Shopping / Custom Label 4
                    '', // Variant Image
                    '', // Variant Weight Unit
                    '', // Variant Tax Code
                    '', // Cost per item
                    product.status || 'active'
                ];

                if (product.variants.length === 0) {
                    // Product without variants
                    const variant = product.variants[0] || {};
                    const row = [...baseProductData];
                    row[8] = 'Title'; // Option1 Name
                    row[9] = 'Default Title'; // Option1 Value
                    row[14] = variant.sku || '';
                    row[15] = variant.grams || '';
                    row[16] = variant.inventory_management || '';
                    row[17] = variant.inventory_quantity || '';
                    row[18] = variant.inventory_policy || '';
                    row[19] = variant.fulfillment_service || '';
                    row[20] = variant.price || '';
                    row[21] = variant.compare_at_price || '';
                    row[22] = variant.requires_shipping ? 'TRUE' : 'FALSE';
                    row[23] = variant.taxable ? 'TRUE' : 'FALSE';
                    row[24] = variant.barcode || '';
                    row[25] = product.images[0]?.src || '';
                    row[26] = product.images[0]?.position || '';
                    row[27] = product.images[0]?.alt || '';
                    row[41] = variant.weight_unit || '';
                    row[42] = variant.tax_code || '';
                    row[43] = variant.cost || '';
                    rows.push(row);
                } else {
                    // Product with variants
                    for (const variant of product.variants) {
                        const row = [...baseProductData];
                        
                        // Set option names and values
                        if (product.options && product.options.length > 0) {
                            const option1 = product.options[0];
                            row[8] = option1.name || '';
                            row[9] = variant.option1 || '';
                            
                            if (product.options.length > 1) {
                                const option2 = product.options[1];
                                row[10] = option2.name || '';
                                row[11] = variant.option2 || '';
                            }
                            
                            if (product.options.length > 2) {
                                const option3 = product.options[2];
                                row[12] = option3.name || '';
                                row[13] = variant.option3 || '';
                            }
                        }

                        // Set variant data
                        row[14] = variant.sku || '';
                        row[15] = variant.grams || '';
                        row[16] = variant.inventory_management || '';
                        row[17] = variant.inventory_quantity || '';
                        row[18] = variant.inventory_policy || '';
                        row[19] = variant.fulfillment_service || '';
                        row[20] = variant.price || '';
                        row[21] = variant.compare_at_price || '';
                        row[22] = variant.requires_shipping ? 'TRUE' : 'FALSE';
                        row[23] = variant.taxable ? 'TRUE' : 'FALSE';
                        row[24] = variant.barcode || '';
                        
                        // Set variant image if exists
                        const variantImage = product.images.find(img => img.id === variant.image_id);
                        row[25] = variantImage?.src || '';
                        row[26] = variantImage?.position || '';
                        row[27] = variantImage?.alt || '';
                        
                        row[41] = variant.weight_unit || '';
                        row[42] = variant.tax_code || '';
                        row[43] = variant.cost || '';
                        
                        rows.push(row);
                    }
                }
            }

            // Convert to CSV string with proper escaping
            const csvContent = rows.map(row => 
                row.map(cell => {
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
                    const escaped = (cell || '').replace(/"/g, '""');
                    return escaped;
                }).join(',')
            ).join('\n');

            return csvContent;
        } catch (error) {
            console.error('Error exporting products:', error);
            throw new Error(`Failed to export products: ${error.message}`);
        }
    },

    generateHandle(title) {
        return (title || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
}; 
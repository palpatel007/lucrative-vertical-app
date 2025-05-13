import { parse } from 'csv-parse/sync';

export const wooCommerceParser = {
    async parseCSV(csvText) {
        try {
            const records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true, // Allow different number of columns
                skip_records_with_error: true // Skip records with errors
            });

            if (!records || records.length === 0) {
                throw new Error('CSV file is empty or has no valid data');
            }

            // Log the first record to help with debugging
            console.log('[WooCommerce Parser] First record:', records[0]);

            return records.map(record => {
                try {
                    // Required fields with fallbacks
                    const title = record['Name'] || '';
                    if (!title) {
                        throw new Error('Product name is required');
                    }

                    // Optional fields with fallbacks
                    let description = record['Description'] || record['Short description'] || '';
                    // Clean up the description by removing special characters
                    description = description
                        .replace(/\\n/g, ' ')  // Replace \n with space
                        .replace(/\n/g, ' ')   // Replace actual newlines with space
                        .replace(/\\r/g, ' ')  // Replace \r with space
                        .replace(/\r/g, ' ')   // Replace actual carriage returns with space
                        .replace(/\\t/g, ' ')  // Replace \t with space
                        .replace(/\t/g, ' ')   // Replace actual tabs with space
                        .replace(/\\"/g, '"')  // Fix escaped quotes
                        .replace(/\\'/g, "'")  // Fix escaped single quotes
                        .replace(/\\\\/g, '\\')  // Fix double escaped backslashes
                        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                        .trim();               // Remove leading/trailing spaces

                    // Handle categories
                    let categories = [];
                    const categoryString = record['Categories'] || '';
                    if (categoryString) {
                        // Split categories by comma and clean them up
                        categories = categoryString
                            .split(',')
                            .map(cat => cat.trim())
                            .filter(Boolean)
                            .map(cat => {
                                // Handle subcategories (e.g., "Parent > Child")
                                return cat.split('>').map(subcat => subcat.trim()).filter(Boolean);
                            });
                    }

                    // Set vendor as the main category if available
                    const vendor = categories.length > 0 ? categories[0][0] : '';

                    // Set product type as the last subcategory if available
                    const productType = categories.length > 0 
                        ? categories[0][categories[0].length - 1] 
                        : record['Type'] || 'simple';

                    const tags = (record['Tags'] || '').split(',').map(tag => tag.trim()).filter(Boolean);
                    
                    // Price handling with validation
                    const price = parseFloat(record['Regular price'] || '0');
                    if (isNaN(price)) {
                        throw new Error(`Invalid price for product: ${title}`);
                    }

                    const compareAtPrice = parseFloat(record['Sale price'] || '0');
                    const finalCompareAtPrice = isNaN(compareAtPrice) ? null : compareAtPrice;

                    // SKU and barcode
                    const sku = record['SKU'] || '';
                    const barcode = record['GTIN, UPC, EAN, or ISBN'] || '';

                    // Weight handling
                    const weight = parseFloat(record['Weight (kg)'] || '0');
                    const finalWeight = isNaN(weight) ? 0 : weight;

                    // Inventory handling
                    const stock = parseInt(record['Stock'] || '0', 10);
                    const finalStock = isNaN(stock) ? 0 : stock;
                    const inventoryPolicy = (record['In stock?'] || '').toLowerCase() === '1' ? 'CONTINUE' : 'DENY';

                    // Images handling
                    const images = [];
                    
                    // Handle main image
                    if (record['Images']) {
                        const imageUrls = record['Images'].split(',')
                            .map(url => url.trim())
                            .filter(Boolean);
                        images.push(...imageUrls);
                    }

                    // Handle additional images
                    for (let i = 1; i <= 5; i++) {
                        const imageKey = `Image ${i}`;
                        if (record[imageKey]) {
                            const imageUrl = record[imageKey].trim();
                            if (imageUrl && !images.includes(imageUrl)) {
                                images.push(imageUrl);
                            }
                        }
                    }

                    // Handle featured image
                    if (record['Featured image']) {
                        const featuredImage = record['Featured image'].trim();
                        if (featuredImage && !images.includes(featuredImage)) {
                            images.unshift(featuredImage); // Add featured image at the beginning
                        }
                    }

                    // Convert to image objects
                    const imageObjects = images.map((url, index) => ({
                        src: url,
                        position: index + 1
                    }));

                    // Status handling
                    const status = (record['Published'] || '').toLowerCase() === '1' ? 'ACTIVE' : 'DRAFT';

                    // Options handling
                    const options = [];
                    
                    // Handle attributes
                    for (let i = 1; i <= 3; i++) {
                        const attrName = record[`Attribute ${i} name`];
                        const attrValues = record[`Attribute ${i} value(s)`];
                        if (attrName && attrValues) {
                            options.push({
                                name: attrName,
                                values: attrValues.split(',').map(val => val.trim()).filter(Boolean)
                            });
                        }
                    }

                    // Handle color if present in meta
                    if (record['Meta: fb_color']) {
                        options.push({
                            name: 'Color',
                            values: record['Meta: fb_color'].split(',').map(color => color.trim()).filter(Boolean)
                        });
                    }

                    // Handle size if present in meta
                    if (record['Meta: fb_size']) {
                        options.push({
                            name: 'Size',
                            values: record['Meta: fb_size'].split(',').map(size => size.trim()).filter(Boolean)
                        });
                    }

                    return {
                        title,
                        description,
                        vendor,
                        productType,
                        tags,
                        price,
                        compareAtPrice: finalCompareAtPrice,
                        sku,
                        barcode,
                        weight: finalWeight,
                        weightUnit: 'KILOGRAMS',
                        inventoryQuantity: finalStock,
                        inventoryPolicy,
                        images: imageObjects,
                        status,
                        options,
                        // Add categories collection
                        collections: categories.map(cat => cat.join(' / ')),
                        variants: [
                            {
                                title: 'Default',
                                price,
                                compareAtPrice: finalCompareAtPrice,
                                sku,
                                barcode,
                                weight: finalWeight,
                                weightUnit: 'KILOGRAMS',
                                inventoryQuantity: finalStock,
                                inventoryPolicy
                            }
                        ]
                    };
                } catch (error) {
                    console.error('[WooCommerce Parser] Error processing record:', error, record);
                    throw new Error(`Error processing product: ${error.message}`);
                }
            });
        } catch (error) {
            console.error('[WooCommerce Parser] Error parsing CSV:', error);
            throw new Error(`Failed to parse WooCommerce CSV file: ${error.message}`);
        }
    }
}; 
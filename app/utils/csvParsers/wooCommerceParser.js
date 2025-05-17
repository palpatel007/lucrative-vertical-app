import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';

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
                    const inventoryPolicy = finalStock > 0 ? 'CONTINUE' : 'DENY';
                    const inventoryManagement = 'shopify'; // Enable inventory tracking

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
                        inventoryManagement,
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
                                inventoryPolicy,
                                inventoryManagement,
                                requires_shipping: true
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
    },
    async exportToCSV(products) {
        const columns = [
            'ID', 'Type', 'SKU', 'GTIN, UPC, EAN, or ISBN', 'Name', 'Published', 'Is featured?', 'Visibility in catalogue', 'Short description', 'Description', 'Date sale price starts', 'Date sale price ends', 'Tax status', 'Tax class', 'In stock?', 'Stock', 'Low stock amount', 'Backorders allowed?', 'Sold individually?', 'Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)', 'Allow customer reviews?', 'Purchase note', 'Sale price', 'Regular price', 'Categories', 'Tags', 'Shipping class', 'Images', 'Download limit', 'Download expiry days', 'Parent', 'Grouped products', 'Upsells', 'Cross-sells', 'External URL', 'Button text', 'Position', 'Swatches Attributes', 'Woo Variation Gallery Images', 'Brands', 'Meta: _wp_page_template', 'Meta: woodmart_sguide_select', 'Meta: woodmart_price_unit_of_measure', 'Meta: woodmart_total_stock_quantity', 'Meta: _product_360_image_gallery', 'Meta: _woodmart_whb_header', 'Meta: _woodmart_main_layout', 'Meta: _woodmart_sidebar_width', 'Meta: _woodmart_custom_sidebar', 'Meta: _woodmart_new_label', 'Meta: _woodmart_new_label_date', 'Meta: _woodmart_swatches_attribute', 'Meta: _woodmart_related_off', 'Meta: _woodmart_exclude_show_single_variation', 'Meta: _woodmart_product_video', 'Meta: _woodmart_product_hashtag', 'Meta: _woodmart_single_product_style', 'Meta: _woodmart_thums_position', 'Meta: _woodmart_extra_content', 'Meta: _woodmart_extra_position', 'Meta: _woodmart_product_design', 'Meta: _woodmart_product-background', 'Meta: _woodmart_hide_tabs_titles', 'Meta: _woodmart_product_custom_tab_title', 'Meta: _woodmart_product_custom_tab_content_type', 'Meta: _woodmart_product_custom_tab_content', 'Meta: _woodmart_product_custom_tab_html_block', 'Meta: _woodmart_product_custom_tab_title_2', 'Meta: _woodmart_product_custom_tab_content_type_2', 'Meta: _woodmart_product_custom_tab_content_2', 'Meta: _woodmart_product_custom_tab_html_block_2', 'Meta: _elementor_edit_mode', 'Meta: _elementor_template_type', 'Meta: _elementor_version', 'Meta: _elementor_pro_version', 'Meta: hara_post_views_count', 'Meta: _subtitle', 'Meta: _hara_attribute_select', 'Meta: _hara_single_layout_select', 'Meta: _aioseo_og_article_section', 'Meta: _elementor_data', 'Meta: _wc_facebook_sync_enabled', 'Meta: fb_visibility', 'Meta: fb_product_description', 'Meta: _wc_facebook_product_image_source', 'Meta: _wc_facebook_commerce_enabled', 'Meta: fb_product_group_id', 'Meta: fb_rich_text_description', 'Meta: fb_brand', 'Meta: fb_mpn', 'Meta: _elementor_element_cache', 'Attribute 1 name', 'Attribute 1 value(s)', 'Attribute 1 visible', 'Attribute 1 global', 'Meta: fb_product_item_id', 'Meta: _aioseo_keywords', 'Meta: _aioseo_og_article_tags', 'Meta: cwg_total_subscribers', 'Meta: rs_page_bg_color', 'Meta: wd_additional_variation_images_data', 'Meta: fb_product_image', 'Meta: fb_product_price', 'Attribute 1 default', 'Meta: _aioseo_title', 'Meta: _aioseo_description', 'Meta: _oembed_0a87a48944a2dcfb10f8182eeda6e62c', 'Meta: _oembed_time_0a87a48944a2dcfb10f8182eeda6e62c', 'Meta: _oembed_39a58a3479d1b0a5a3b1d853e7c0b4a8', 'Meta: _oembed_time_39a58a3479d1b0a5a3b1d853e7c0b4a8', 'Meta: fb_size', 'Meta: fb_color', 'Meta: fb_material', 'Meta: fb_pattern', 'Meta: fb_age_group', 'Meta: fb_gender', 'Meta: fb_product_condition', 'Attribute 2 name', 'Attribute 2 value(s)', 'Attribute 2 visible', 'Attribute 2 global', 'Meta: _wc_facebook_google_product_category', 'Meta: _wc_facebook_enhanced_catalog_attributes_product_length', 'Meta: _wc_facebook_enhanced_catalog_attributes_product_width', 'Meta: _wc_facebook_enhanced_catalog_attributes_color', 'Meta: _wc_facebook_enhanced_catalog_attributes_material', 'Meta: _wc_facebook_enhanced_catalog_attributes_pattern', 'Meta: _wc_facebook_enhanced_catalog_attributes_decor_style', 'Meta: _wc_facebook_enhanced_catalog_attributes_additional_features', 'Meta: _wc_facebook_enhanced_catalog_attributes_occasion', 'Meta: _wc_facebook_enhanced_catalog_attributes_standard_features', 'Meta: _wc_facebook_enhanced_catalog_attributes_size', 'Meta: _wc_facebook_enhanced_catalog_attributes_shape', 'Meta: _wc_facebook_enhanced_catalog_attributes_scent', 'Meta: _wc_facebook_enhanced_catalog_attributes_recommended_rooms', 'Meta: _wc_facebook_enhanced_catalog_attributes_product_weight', 'Meta: _wc_facebook_enhanced_catalog_attributes_product_height', 'Meta: _wc_facebook_enhanced_catalog_attributes_power_type', 'Meta: _wc_facebook_enhanced_catalog_attributes_number_of_shelves', 'Meta: _wc_facebook_enhanced_catalog_attributes_numberof_lights', 'Meta: _wc_facebook_enhanced_catalog_attributes_age_group', 'Meta: _wc_facebook_enhanced_catalog_attributes_number_of_drawers', 'Meta: _wc_facebook_enhanced_catalog_attributes_mount_type', 'Meta: _wc_facebook_enhanced_catalog_attributes_light_bulb_type', 'Meta: _wc_facebook_enhanced_catalog_attributes_is_powered', 'Meta: _wc_facebook_enhanced_catalog_attributes_is_assembly_required', 'Meta: _wc_facebook_enhanced_catalog_attributes_gender', 'Meta: _wc_facebook_enhanced_catalog_attributes_finish', 'Meta: _wc_facebook_enhanced_catalog_attributes_character', 'Meta: _wc_facebook_enhanced_catalog_attributes_capacity', 'Meta: _wc_facebook_enhanced_catalog_attributes_brand', 'Meta: _wc_facebook_enhanced_catalog_attributes_theme', 'Meta: pisol_mmq_disable_global_min_max'
        ];
        const records = products.map((product, idx) => {
            const variant = Array.isArray(product.variants) && product.variants[0] ? product.variants[0] : {};
            return {
                'ID': product.id ? (product.id.split('/').pop()) : (idx + 1),
                'Type': product.productType || 'simple',
                'SKU': variant.sku || '',
                'GTIN, UPC, EAN, or ISBN': variant.barcode || '',
                'Name': product.title || '',
                'Published': product.status === 'ACTIVE' || product.status === 'active' ? '1' : '0',
                'Is featured?': '',
                'Visibility in catalogue': 'visible',
                'Short description': '',
                'Description': product.description || product.bodyHtml || '',
                'Date sale price starts': '',
                'Date sale price ends': '',
                'Tax status': 'taxable',
                'Tax class': '',
                'In stock?': (variant.inventoryQuantity || 0) > 0 ? '1' : '0',
                'Stock': variant.inventoryQuantity || '',
                'Low stock amount': '',
                'Backorders allowed?': '',
                'Sold individually?': '',
                'Weight (kg)': variant.weight || '',
                'Length (cm)': '',
                'Width (cm)': '',
                'Height (cm)': '',
                'Allow customer reviews?': '1',
                'Purchase note': '',
                'Sale price': variant.price || '',
                'Regular price': variant.compareAtPrice || '',
                'Categories': Array.isArray(product.collections) ? product.collections.join(',') : (product.collections || ''),
                'Tags': Array.isArray(product.tags) ? product.tags.join(',') : (product.tags || ''),
                'Shipping class': '',
                'Images': Array.isArray(product.images) ? product.images.map(img => img.src).join(', ') : '',
                // All other fields left blank
                'Download limit': '',
                'Download expiry days': '',
                'Parent': '',
                'Grouped products': '',
                'Upsells': '',
                'Cross-sells': '',
                'External URL': '',
                'Button text': '',
                'Position': '',
                'Swatches Attributes': '',
                'Woo Variation Gallery Images': '',
                'Brands': product.vendor || '',
                // Meta fields and attributes
                'Meta: _wp_page_template': '',
                'Meta: woodmart_sguide_select': '',
                'Meta: woodmart_price_unit_of_measure': '',
                'Meta: woodmart_total_stock_quantity': '',
                'Meta: _product_360_image_gallery': '',
                'Meta: _woodmart_whb_header': '',
                'Meta: _woodmart_main_layout': '',
                'Meta: _woodmart_sidebar_width': '',
                'Meta: _woodmart_custom_sidebar': '',
                'Meta: _woodmart_new_label': '',
                'Meta: _woodmart_new_label_date': '',
                'Meta: _woodmart_swatches_attribute': '',
                'Meta: _woodmart_related_off': '',
                'Meta: _woodmart_exclude_show_single_variation': '',
                'Meta: _woodmart_product_video': '',
                'Meta: _woodmart_product_hashtag': '',
                'Meta: _woodmart_single_product_style': '',
                'Meta: _woodmart_thums_position': '',
                'Meta: _woodmart_extra_content': '',
                'Meta: _woodmart_extra_position': '',
                'Meta: _woodmart_product_design': '',
                'Meta: _woodmart_product-background': '',
                'Meta: _woodmart_hide_tabs_titles': '',
                'Meta: _woodmart_product_custom_tab_title': '',
                'Meta: _woodmart_product_custom_tab_content_type': '',
                'Meta: _woodmart_product_custom_tab_content': '',
                'Meta: _woodmart_product_custom_tab_html_block': '',
                'Meta: _woodmart_product_custom_tab_title_2': '',
                'Meta: _woodmart_product_custom_tab_content_type_2': '',
                'Meta: _woodmart_product_custom_tab_content_2': '',
                'Meta: _woodmart_product_custom_tab_html_block_2': '',
                'Meta: _elementor_edit_mode': '',
                'Meta: _elementor_template_type': '',
                'Meta: _elementor_version': '',
                'Meta: _elementor_pro_version': '',
                'Meta: hara_post_views_count': '',
                'Meta: _subtitle': '',
                'Meta: _hara_attribute_select': '',
                'Meta: _hara_single_layout_select': '',
                'Meta: _aioseo_og_article_section': '',
                'Meta: _elementor_data': '',
                'Meta: _wc_facebook_sync_enabled': '',
                'Meta: fb_visibility': '',
                'Meta: fb_product_description': '',
                'Meta: _wc_facebook_product_image_source': '',
                'Meta: _wc_facebook_commerce_enabled': '',
                'Meta: fb_product_group_id': '',
                'Meta: fb_rich_text_description': '',
                'Meta: fb_brand': '',
                'Meta: fb_mpn': '',
                'Meta: _elementor_element_cache': '',
                'Attribute 1 name': '',
                'Attribute 1 value(s)': '',
                'Attribute 1 visible': '',
                'Attribute 1 global': '',
                'Meta: fb_product_item_id': '',
                'Meta: _aioseo_keywords': '',
                'Meta: _aioseo_og_article_tags': '',
                'Meta: cwg_total_subscribers': '',
                'Meta: rs_page_bg_color': '',
                'Meta: wd_additional_variation_images_data': '',
                'Meta: fb_product_image': '',
                'Meta: fb_product_price': '',
                'Attribute 1 default': '',
                'Meta: _aioseo_title': '',
                'Meta: _aioseo_description': '',
                'Meta: _oembed_0a87a48944a2dcfb10f8182eeda6e62c': '',
                'Meta: _oembed_time_0a87a48944a2dcfb10f8182eeda6e62c': '',
                'Meta: _oembed_39a58a3479d1b0a5a3b1d853e7c0b4a8': '',
                'Meta: _oembed_time_39a58a3479d1b0a5a3b1d853e7c0b4a8': '',
                'Meta: fb_size': '',
                'Meta: fb_color': '',
                'Meta: fb_material': '',
                'Meta: fb_pattern': '',
                'Meta: fb_age_group': '',
                'Meta: fb_gender': '',
                'Meta: fb_product_condition': '',
                'Attribute 2 name': '',
                'Attribute 2 value(s)': '',
                'Attribute 2 visible': '',
                'Attribute 2 global': '',
                'Meta: _wc_facebook_google_product_category': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_product_length': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_product_width': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_color': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_material': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_pattern': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_decor_style': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_additional_features': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_occasion': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_standard_features': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_size': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_shape': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_scent': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_recommended_rooms': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_product_weight': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_product_height': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_power_type': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_number_of_shelves': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_numberof_lights': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_age_group': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_number_of_drawers': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_mount_type': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_light_bulb_type': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_is_powered': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_is_assembly_required': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_gender': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_finish': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_character': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_capacity': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_brand': '',
                'Meta: _wc_facebook_enhanced_catalog_attributes_theme': '',
                'Meta: pisol_mmq_disable_global_min_max': ''
            };
        });
        return new Promise((resolve, reject) => {
            stringify(records, { header: true, columns }, (err, output) => {
                if (err) reject(err);
                else resolve(output);
            });
        });
    }
}; 
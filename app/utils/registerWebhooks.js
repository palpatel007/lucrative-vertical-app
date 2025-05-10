import { authenticate } from '../shopify.server.js';

export async function registerWebhooks(shop, accessToken) {
    console.log('[Webhook Registration] Starting webhook registration for shop:', shop);
    
    const webhooks = [
        {
            topic: 'APP_SUBSCRIPTIONS_UPDATE',
            address: `${process.env.SHOPIFY_APP_URL}/webhooks/subscription`,
            format: 'json'
        },
        {
            topic: 'APP_SUBSCRIPTIONS_CANCEL',
            address: `${process.env.SHOPIFY_APP_URL}/webhooks/subscription`,
            format: 'json'
        },
        {
            topic: 'APP_SUBSCRIPTIONS_PAYMENT_FAILURE',
            address: `${process.env.SHOPIFY_APP_URL}/webhooks/subscription`,
            format: 'json'
        }
    ];

    try {
        console.log('[Webhook Registration] Fetching existing webhooks...');
        // First, get existing webhooks
        const response = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('[Webhook Registration] Failed to fetch webhooks:', {
                status: response.status,
                statusText: response.statusText
            });
            throw new Error(`Failed to fetch existing webhooks: ${response.statusText}`);
        }

        const data = await response.json();
        const existingWebhooks = data.webhooks || [];
        console.log('[Webhook Registration] Found existing webhooks:', existingWebhooks.length);

        // Delete existing webhooks for our topics
        for (const webhook of existingWebhooks) {
            if (webhooks.some(w => w.topic === webhook.topic)) {
                console.log('[Webhook Registration] Deleting existing webhook:', webhook.topic);
                const deleteResponse = await fetch(`https://${shop}/admin/api/2024-01/webhooks/${webhook.id}.json`, {
                    method: 'DELETE',
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                    },
                });

                if (!deleteResponse.ok) {
                    console.error('[Webhook Registration] Failed to delete webhook:', {
                        topic: webhook.topic,
                        status: deleteResponse.status,
                        statusText: deleteResponse.statusText
                    });
                } else {
                    console.log('[Webhook Registration] Successfully deleted webhook:', webhook.topic);
                }
            }
        }

        // Register new webhooks
        for (const webhook of webhooks) {
            console.log('[Webhook Registration] Registering webhook:', webhook.topic);
            const registerResponse = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
                method: 'POST',
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ webhook }),
            });

            if (!registerResponse.ok) {
                console.error('[Webhook Registration] Failed to register webhook:', {
                    topic: webhook.topic,
                    status: registerResponse.status,
                    statusText: registerResponse.statusText,
                    response: await registerResponse.text()
                });
            } else {
                const webhookData = await registerResponse.json();
                console.log('[Webhook Registration] Successfully registered webhook:', {
                    topic: webhook.topic,
                    id: webhookData.webhook.id
                });
            }
        }

        console.log('[Webhook Registration] Completed webhook registration');
    } catch (error) {
        console.error('[Webhook Registration] Error:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
} 
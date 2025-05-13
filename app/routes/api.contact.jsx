import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';

export const action = async ({ request }) => {
  console.log('[API Contact] Request received');
  
  try {
    console.log('[API Contact] Processing form data');
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    // Log received data
    console.log('[API Contact] Received form data:', data);

    // Basic validation
    if (!data.name || !data.email) {
      console.log('[API Contact] Validation failed - missing required fields');
      return json({
        success: false,
        error: 'Name and email are required fields'
      }, { status: 400 });
    }

    // Here you would typically:
    // 1. Validate the form data
    // 2. Send an email
    // 3. Store in database
    console.log('[API Contact] Processing successful');

    return json({
      success: true,
      message: 'Your message has been sent successfully!'
    });
  } catch (error) {
    console.error('[API Contact] Error processing request:', error);
    return json({
      success: false,
      error: 'Failed to process your request. Please try again.'
    }, { status: 500 });
  }
}; 
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    
    if (!session?.shop) {
      console.error('[Shop API] No shop in session');
      return json({ 
        success: false, 
        error: 'Please log in to continue'
      }, { status: 401 });
    }

    console.log('[Shop API] Shop found:', session.shop);
    return json({ 
      success: true,
      shop: session.shop
    });
  } catch (error) {
    console.error('[Shop API] Error:', error);
    return json({ 
      success: false, 
      error: 'Failed to get shop information'
    }, { status: 500 });
  }
}; 
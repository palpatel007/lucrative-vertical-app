import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { Shop } from '../models/Shop';

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

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    if (!session?.shop) {
      return json({ success: false, error: 'Please log in to continue' }, { status: 401 });
    }
    const body = await request.json();
    const { language } = body;
    if (!language) {
      return json({ success: false, error: 'Language is required' }, { status: 400 });
    }
    const updatedShop = await Shop.findOneAndUpdate(
      { shop: session.shop },
      { language },
      { new: true }
    );
    return json({ success: true, shop: updatedShop });
  } catch (error) {
    console.error('[Shop API] Error updating language:', error);
    return json({ success: false, error: 'Failed to update language' }, { status: 500 });
  }
}; 
import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  return json({
    accessToken: session.accessToken,
    shop: session.shop,
    shopId: session.shopId
  });
};

export const action = async ({ request }) => {
    try {
        const { session } = await authenticate.admin(request);
        if (!session) {
            return redirect('/auth');
        }

        // Return the refreshed session
        return json({ session });
    } catch (error) {
        console.error('[Auth Refresh] Error:', error);
        return redirect('/auth');
    }
};


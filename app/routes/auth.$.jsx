import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';

export const loader = async ({ request }) => {
  console.log('[Auth Route] Loader called. Request URL:', request.url);
  const { session } = await authenticate.admin(request);
  console.log('[Auth Route] Session:', session);
  if (!session) {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    const returnTo = url.searchParams.get('returnTo') || '/app/dashboard';
    if (shop) {
      // Redirect to Shopify OAuth flow, preserving returnTo
      return redirect(`/auth/callback?shop=${shop}&returnTo=${encodeURIComponent(returnTo)}`);
    }
    // If no shop, show login page or error
    return redirect('/auth/login');
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


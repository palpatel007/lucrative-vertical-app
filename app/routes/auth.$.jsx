import { json, redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server.js';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  if (!session) {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    const returnTo = url.searchParams.get('returnTo') || '/app/dashboard';
    if (shop) {
      return redirect(`/auth/callback?shop=${shop}&returnTo=${encodeURIComponent(returnTo)}`);
    }
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

        return json({ session });
    } catch (error) {
        return redirect('/auth');
    }
};


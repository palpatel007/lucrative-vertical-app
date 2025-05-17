import { useEffect } from 'react';
import { useSearchParams } from '@remix-run/react';

export default function ForceRedirect() {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get('shop');
  const appHandle = shop; // or your actual app handle

  useEffect(() => {
    if (shop) {
      window.top.location.href = `https://${shop}/admin/apps/${appHandle}`;
    }
  }, [shop, appHandle]);

  return <div>Redirecting to your Shopify admin app...</div>;
} 
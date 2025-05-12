import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

export const loader = async () => {
  return json({
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
  });
};

// Helper to get host from URL
function getHost() {
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("host");
  }
  return null;
}

export default function App() {
  const { SHOPIFY_API_KEY } = useLoaderData();
  const host = getHost();
  const config = {
    apiKey: SHOPIFY_API_KEY,
    host,
    forceRedirect: true,
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <PolarisAppProvider i18n={enTranslations}>
          <Outlet />
          <ScrollRestoration />
          <Scripts />
        </PolarisAppProvider>
      </body>
    </html>
  );
}

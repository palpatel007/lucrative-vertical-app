import './styles/globals.css';
import {
  Links,
  LiveReload,
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
import { ChakraProvider } from '@chakra-ui/react';
import { useEffect } from "react";

export const loader = async () => {
  return json({
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
  });
};

// Helper to get host from URL on client side
function getHost() {
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("host");
  }
  return null;
}

export default function App() {
  const { SHOPIFY_API_KEY } = useLoaderData();
  const host = getHost();


  useEffect(() => {
    if (typeof window !== "undefined" && !window.$crisp) {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = "e53b3b6a-b1a1-40c7-9811-6a322a89463b";

      const d = document;
      const s = d.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = true;
      d.getElementsByTagName("head")[0].appendChild(s);
    }
  }, []);

  // App Bridge config
  const appBridgeConfig = {
    apiKey: SHOPIFY_API_KEY || "",
    host: host || "",
    forceRedirect: true,
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <link href="https://fonts.googleapis.com/css2?family=Polaris:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ChakraProvider resetCSS={false}>
          {/* Shopify App Bridge Provider removed for v4.x+ */}
          <PolarisAppProvider i18n={enTranslations}>
            <Outlet />
            <ScrollRestoration />
            <Scripts />
            <LiveReload />
          </PolarisAppProvider>
        </ChakraProvider>
      </body>
    </html>
  );
}

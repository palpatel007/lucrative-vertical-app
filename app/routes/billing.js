import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { billing } = await authenticate.admin(request);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "accept" && billing.require) {
      return json({ redirectUrl: billing.redirectUrl });
    }

    return json({ redirectUrl: null });
  } catch (error) {
    console.error("Error in billing loader:", error);
    // If we get a 410 Gone error, treat it as if billing is not required
    if (error.status === 410) {
      return json({ redirectUrl: null });
    }
    throw error;
  }
};

export const action = async ({ request }) => {
  try {
    const { billing } = await authenticate.admin(request);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "accept" && billing.require) {
      return json({ redirectUrl: billing.redirectUrl });
    }

    return json({ redirectUrl: null });
  } catch (error) {
    console.error("Error in billing action:", error);
    // If we get a 410 Gone error, treat it as if billing is not required
    if (error.status === 410) {
      return json({ redirectUrl: null });
    }
    throw error;
  }
}; 
import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";
import { connectDatabase } from "../utils/database";

export const loader = async ({ request }) => {
  try {
    // First, ensure database connection
    await connectDatabase();
    console.log("[Install] Database connected");

    const { admin, session } = await authenticate.admin(request);
    console.log("[Install] Authentication successful for shop:", session?.shop);

    if (!session?.shop) {
      console.error("[Install] No session found");
      throw new Error("No session found");
    }

    // Redirect to the auth callback route
    return redirect(`/auth/callback?shop=${session.shop}`);
  } catch (error) {
    console.error("[Install] Error during installation:", error);
    // Log the full error details
    console.error("[Install] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Failed to start installation: ${error.message}`);
  }
}; 
import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";
import { connectDatabase } from "../utils/database";

export const loader = async ({ request }) => {
  try {
    // First, ensure database connection
    await connectDatabase();

    const { admin, session } = await authenticate.admin(request);

    if (!session?.shop) {
      throw new Error("No session found");
    }

    // Redirect to the auth callback route
    return redirect(`/auth/callback?shop=${session.shop}`);
  } catch (error) {
    throw new Error(`Failed to start installation: ${error.message}`);
  }
}; 
// app/routes/check-scopes.jsx
import { redirect, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session) {
    return redirect("/auth"); // fallback if unauthenticated
  }

  const requiredScopes = ["read_metafields", "write_metafields"];
  const sessionScopes = session.scope ? session.scope.split(",") : [];

  const missingScopes = requiredScopes.some(
    (scope) => !sessionScopes.includes(scope)
  );

  if (missingScopes) {
    const shop = session.shop;
    const returnTo = "/app/dashboard"; // or wherever you want to return after auth
    return redirect(`/auth?shop=${shop}&returnTo=${encodeURIComponent(returnTo)}`);
  }

  return json({ ok: true });
};

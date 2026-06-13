/** Session helpers for route handlers and server components. */
import { auth } from "./auth";
import { HttpError } from "@/lib/http";

/** Returns the authenticated user's id, or throws HttpError(401). */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new HttpError(401, "Not authenticated");
  return id;
}

/** Returns the user id or null (for pages that render a signed-out state). */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

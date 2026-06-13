import { errorResponse, json } from "@/lib/http";
import { requireUserId } from "@/server/session";
import { getSummary } from "@/server/services/statsService";

export async function GET() {
  try {
    const userId = await requireUserId();
    return json(await getSummary(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

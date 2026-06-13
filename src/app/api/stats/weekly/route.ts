import { errorResponse, json } from "@/lib/http";
import { requireUserId } from "@/server/session";
import { getWeeklyActivity } from "@/server/services/statsService";

export async function GET() {
  try {
    const userId = await requireUserId();
    return json(await getWeeklyActivity(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

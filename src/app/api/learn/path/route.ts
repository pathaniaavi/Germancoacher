import { errorResponse, json } from "@/lib/http";
import { requireUserId } from "@/server/session";
import { getPath } from "@/server/services/learnService";

export async function GET() {
  try {
    const userId = await requireUserId();
    return json(await getPath(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

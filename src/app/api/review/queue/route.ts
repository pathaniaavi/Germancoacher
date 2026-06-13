import { errorResponse, json } from "@/lib/http";
import { requireUserId } from "@/server/session";
import { buildReviewQueue } from "@/server/services/reviewService";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const mode = new URL(req.url).searchParams.get("mode") ?? "FLASHCARD";
    return json(await buildReviewQueue(userId, mode));
  } catch (e) {
    return errorResponse(e);
  }
}

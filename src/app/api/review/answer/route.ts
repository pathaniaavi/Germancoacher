import { errorResponse, json, parseBody } from "@/lib/http";
import { reviewAnswerSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { answerReview } from "@/server/services/reviewService";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, reviewAnswerSchema);
    return json(await answerReview(userId, input));
  } catch (e) {
    return errorResponse(e);
  }
}

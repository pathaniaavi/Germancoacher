import { errorResponse, json, parseBody } from "@/lib/http";
import { practiceAttemptSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { recordAttempt } from "@/server/services/practiceService";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, practiceAttemptSchema);
    return json(await recordAttempt(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

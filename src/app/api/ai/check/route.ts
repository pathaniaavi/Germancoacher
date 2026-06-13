import { errorResponse, json, parseBody } from "@/lib/http";
import { aiCheckSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { getAIServiceForUser } from "@/server/ai";
import { wordContext } from "@/server/ai/context";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { wordId, userSentence } = await parseBody(req, aiCheckSchema);
    const ctx = await wordContext(userId, wordId);
    const { service, usingClaude } = await getAIServiceForUser(userId);
    const verdict = await service.checkSentence(ctx, userSentence);
    return json({ source: usingClaude ? "claude" : "fallback", verdict });
  } catch (e) {
    return errorResponse(e);
  }
}

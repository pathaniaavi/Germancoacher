import { errorResponse, json, parseBody } from "@/lib/http";
import { aiWordRefSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { getAIServiceForUser } from "@/server/ai";
import { wordContext } from "@/server/ai/context";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { wordId } = await parseBody(req, aiWordRefSchema);
    const ctx = await wordContext(userId, wordId);
    const { service, usingClaude } = await getAIServiceForUser(userId);
    const suggestions = await service.suggestSentences(ctx);
    return json({ source: usingClaude ? "claude" : "fallback", suggestions });
  } catch (e) {
    return errorResponse(e);
  }
}

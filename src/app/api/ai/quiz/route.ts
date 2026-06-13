import { errorResponse, json, parseBody } from "@/lib/http";
import { aiQuizSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { getAIServiceForUser } from "@/server/ai";
import { quizWordContexts } from "@/server/ai/context";
import { HttpError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { count, filter } = await parseBody(req, aiQuizSchema);
    const words = await quizWordContexts(userId, filter);
    if (words.length === 0) throw new HttpError(400, "No words available to build a quiz");
    const { service, usingClaude } = await getAIServiceForUser(userId);
    const quiz = await service.generateQuiz(words, count);
    return json({ source: usingClaude ? "claude" : "fallback", quiz });
  } catch (e) {
    return errorResponse(e);
  }
}

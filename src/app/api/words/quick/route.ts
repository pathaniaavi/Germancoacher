import { errorResponse, json, parseBody } from "@/lib/http";
import { quickAddSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { quickAddWord } from "@/server/services/wordService";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, quickAddSchema);
    return json(await quickAddWord(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

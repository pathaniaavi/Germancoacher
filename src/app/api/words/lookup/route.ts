import { errorResponse, json, parseBody } from "@/lib/http";
import { wordLookupRequestSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { previewWord } from "@/server/services/wordService";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { word, translation } = await parseBody(req, wordLookupRequestSchema);
    return json(await previewWord(userId, word, translation));
  } catch (e) {
    return errorResponse(e);
  }
}

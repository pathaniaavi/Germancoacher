import { errorResponse, json, parseBody } from "@/lib/http";
import { createWordSchema, listWordsQuerySchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { createWord, listWords } from "@/server/services/wordService";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const query = listWordsQuerySchema.parse(params);
    return json(await listWords(userId, query));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, createWordSchema);
    return json(await createWord(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

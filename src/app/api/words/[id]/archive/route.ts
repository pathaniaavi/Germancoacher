import { errorResponse, json, parseBody } from "@/lib/http";
import { z } from "zod";
import { requireUserId } from "@/server/session";
import { archiveWord } from "@/server/services/wordService";

const bodySchema = z.object({ archived: z.boolean().default(true) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const { archived } = await parseBody(req, bodySchema);
    return json(await archiveWord(userId, id, archived));
  } catch (e) {
    return errorResponse(e);
  }
}

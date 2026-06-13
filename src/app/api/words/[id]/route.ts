import { errorResponse, json, parseBody } from "@/lib/http";
import { updateWordSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { deleteWord, getWord, updateWord } from "@/server/services/wordService";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    return json(await getWord(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const input = await parseBody(req, updateWordSchema);
    return json(await updateWord(userId, id, input));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    await deleteWord(userId, id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}

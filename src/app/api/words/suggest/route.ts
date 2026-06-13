import { errorResponse, json } from "@/lib/http";
import { requireUserId } from "@/server/session";
import { suggestGerman } from "@/server/dictionary/wiktionary";

export async function GET(req: Request) {
  try {
    await requireUserId();
    const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
    return json(await suggestGerman(q));
  } catch (e) {
    return errorResponse(e);
  }
}

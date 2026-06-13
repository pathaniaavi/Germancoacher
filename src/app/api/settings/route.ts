import { errorResponse, json, parseBody } from "@/lib/http";
import { settingsUpdateSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { getSettings, updateSettings } from "@/server/services/settingsService";

export async function GET() {
  try {
    const userId = await requireUserId();
    return json(await getSettings(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, settingsUpdateSchema);
    return json(await updateSettings(userId, input));
  } catch (e) {
    return errorResponse(e);
  }
}

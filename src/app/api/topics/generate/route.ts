import { errorResponse, json, parseBody } from "@/lib/http";
import { generateTopicSchema } from "@/lib/validation";
import { requireUserId } from "@/server/session";
import { generateTopicPack } from "@/server/services/topicService";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, generateTopicSchema);
    return json(await generateTopicPack(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Selects the AI implementation per user: their saved key, else env, else fallback. */
import { prisma } from "@/server/db";
import { FallbackAIService } from "@/core/ai/fallback";
import type { AIService } from "@/core/ai/types";
import { ClaudeAIService } from "./claudeService";

export interface ResolvedAI {
  service: AIService;
  /** true when real Claude is in use (drives the "claude" vs "fallback" source label). */
  usingClaude: boolean;
}

/**
 * Resolve the AI service for a user. Priority: the user's saved Anthropic key, then the
 * server `ANTHROPIC_API_KEY`, then the deterministic fallback. Honors the aiEnabled toggle.
 */
export async function getAIServiceForUser(userId: string): Promise<ResolvedAI> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  if (settings && settings.aiEnabled === false) {
    return { service: new FallbackAIService(), usingClaude: false };
  }

  const apiKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "";
  const model = settings?.aiModel || process.env.ANTHROPIC_MODEL || undefined;

  if (apiKey) {
    return { service: new ClaudeAIService({ apiKey, model }), usingClaude: true };
  }
  return { service: new FallbackAIService(), usingClaude: false };
}

/** Read/update per-user settings. The Anthropic key is stored but never returned raw. */
import type { Prisma, UserSettings } from "@prisma/client";
import { prisma } from "@/server/db";
import type { SettingsDTO } from "@/lib/dto";
import type { SettingsUpdateInput } from "@/lib/validation";

function toDTO(settings: UserSettings): SettingsDTO {
  const userKey = settings.anthropicApiKey?.trim() || null;
  const envKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
  return {
    dailyReviewLimit: settings.dailyReviewLimit,
    newCardsPerDay: settings.newCardsPerDay,
    theme: settings.theme,
    aiEnabled: settings.aiEnabled,
    aiModel: settings.aiModel,
    aiKeyConfigured: Boolean(userKey || envKey),
    aiKeySource: userKey ? "user" : envKey ? "env" : "none",
    aiKeyHint: userKey ? `…${userKey.slice(-4)}` : null,
  };
}

export async function getSettings(userId: string): Promise<SettingsDTO> {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return toDTO(settings);
}

export async function updateSettings(
  userId: string,
  input: SettingsUpdateInput,
): Promise<SettingsDTO> {
  const data: Prisma.UserSettingsUncheckedUpdateInput = {};
  if (input.dailyReviewLimit !== undefined) data.dailyReviewLimit = input.dailyReviewLimit;
  if (input.newCardsPerDay !== undefined) data.newCardsPerDay = input.newCardsPerDay;
  if (input.theme !== undefined) data.theme = input.theme;
  if (input.aiEnabled !== undefined) data.aiEnabled = input.aiEnabled;
  if (input.aiModel !== undefined) data.aiModel = input.aiModel;
  if (input.anthropicApiKey !== undefined) {
    const trimmed = input.anthropicApiKey.trim();
    data.anthropicApiKey = trimmed === "" ? null : trimmed;
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...data } as Prisma.UserSettingsUncheckedCreateInput,
    update: data,
  });
  return toDTO(settings);
}

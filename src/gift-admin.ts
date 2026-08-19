import type { Ctx } from "./bot.js";
import { getChatConfig, type ChatConfig } from "./gift-store.js";

export function isGroup(ctx: Ctx): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

export async function isChatAdmin(ctx: Ctx): Promise<boolean> {
  if (!isGroup(ctx) || !ctx.from) return false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return member.status === "administrator" || member.status === "creator";
  } catch {
    return false;
  }
}

export async function requireChatAdmin(ctx: Ctx): Promise<boolean> {
  if (!isGroup(ctx)) {
    await ctx.reply("Add me to a group, then an admin can set up gift draws there.");
    return false;
  }
  if (!(await isChatAdmin(ctx))) {
    await ctx.reply("Only a group admin can change gift draws.");
    return false;
  }
  return true;
}

export async function configOrReply(ctx: Ctx): Promise<ChatConfig | undefined> {
  try {
    const config = await getChatConfig(ctx);
    if (config) return config;
  } catch {
    // Keep storage details private.
  }
  await ctx.reply("Gift draws aren't set up yet. Try again in a moment.");
  return undefined;
}

import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { saveChatConfig } from "../gift-store.js";
import { configOrReply, requireChatAdmin } from "../gift-admin.js";

const composer = new Composer<Ctx>();

composer.command("enable", async (ctx) => {
  if (!(await requireChatAdmin(ctx))) return;
  const config = await configOrReply(ctx);
  if (!config) return;
  config.enabled = true;
  await saveChatConfig(ctx, config);
  await ctx.reply(`Gift draws are on. I’ll pick a winner with a ${config.selection_chance}% chance on each message.`);
});

composer.callbackQuery("gift:enable", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireChatAdmin(ctx))) return;
  const config = await configOrReply(ctx);
  if (!config) return;
  config.enabled = true;
  await saveChatConfig(ctx, config);
  await ctx.editMessageText(`Gift draws are on. The chance is ${config.selection_chance}%.`);
});

export default composer;

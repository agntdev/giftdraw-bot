import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { saveChatConfig } from "../gift-store.js";
import { configOrReply, requireChatAdmin } from "../gift-admin.js";

const composer = new Composer<Ctx>();

composer.command("disable", async (ctx) => {
  if (!(await requireChatAdmin(ctx))) return;
  const config = await configOrReply(ctx);
  if (!config) return;
  config.enabled = false;
  await saveChatConfig(ctx, config);
  await ctx.reply("Gift draws are paused. Turn them back on whenever you’re ready.");
});

composer.callbackQuery("gift:disable", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireChatAdmin(ctx))) return;
  const config = await configOrReply(ctx);
  if (!config) return;
  config.enabled = false;
  await saveChatConfig(ctx, config);
  await ctx.editMessageText("Gift draws are paused. Turn them back on whenever you’re ready.");
});

export default composer;

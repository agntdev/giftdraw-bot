import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { saveChatConfig } from "../gift-store.js";
import { configOrReply, requireChatAdmin } from "../gift-admin.js";

const composer = new Composer<Ctx>();

composer.command("chance", async (ctx) => {
  if (!(await requireChatAdmin(ctx))) return;
  const raw = ctx.match.trim();
  if (!/^\d{1,3}(?:\.\d+)?$/.test(raw)) {
    await ctx.reply("Send a chance from 0 to 100. For example: /chance 5");
    return;
  }
  const chance = Number(raw);
  if (!Number.isFinite(chance) || chance < 0 || chance > 100) {
    await ctx.reply("Send a chance from 0 to 100. For example: /chance 5");
    return;
  }
  const config = await configOrReply(ctx);
  if (!config) return;
  config.selection_chance = chance;
  await saveChatConfig(ctx, config);
  await ctx.reply(`The gift-draw chance is now ${chance}%.`);
});

export default composer;

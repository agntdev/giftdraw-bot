import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { configOrReply, requireChatAdmin } from "../gift-admin.js";

const composer = new Composer<Ctx>();

async function showLastDraw(ctx: Ctx): Promise<void> {
  const config = await configOrReply(ctx);
  if (!config) return;
  if (!config.last_winner_id) {
    await ctx.reply("No gift draw yet — enable draws and I’ll announce the first winner here.");
    return;
  }
  const winner = config.members.find((member) => member.id === config.last_winner_id);
  await ctx.reply(winner ? `The latest winner was ${winner.username ? `@${winner.username}` : winner.name}.` : "I found the latest draw, but the winner is no longer in this chat.");
}

composer.command("lastdraw", async (ctx) => {
  if (!(await requireChatAdmin(ctx))) return;
  await showLastDraw(ctx);
});

composer.callbackQuery("gift:last", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireChatAdmin(ctx))) return;
  await showLastDraw(ctx);
});

export default composer;

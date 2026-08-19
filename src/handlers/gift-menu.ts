import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { configOrReply, requireChatAdmin } from "../gift-admin.js";

registerMainMenuItem({ label: "🎁 Gift draws", data: "gift:menu", order: 10 });

const composer = new Composer<Ctx>();

function keyboard(enabled: boolean) {
  return inlineKeyboard([
    [inlineButton(enabled ? "Pause draws" : "Enable draws", enabled ? "gift:disable" : "gift:enable")],
    [inlineButton("Set chance", "gift:chance"), inlineButton("Last draw", "gift:last")],
    [inlineButton("⬅️ Back", "menu:main")],
  ]);
}

composer.callbackQuery("gift:menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireChatAdmin(ctx))) return;
  const config = await configOrReply(ctx);
  if (!config) return;
  const state = config.enabled ? "Gift draws are on" : "Gift draws are paused";
  await ctx.editMessageText(`${state}. The chance is ${config.selection_chance}%.`, {
    reply_markup: keyboard(config.enabled),
  });
});

composer.callbackQuery("gift:chance", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireChatAdmin(ctx))) return;
  await ctx.reply("Send /chance followed by a number from 0 to 100. For example: /chance 5");
});

export default composer;

import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getChatConfig, now, randomPercentHit, saveChatConfig } from "../gift-store.js";
import { isGroup } from "../gift-admin.js";
import { chooseRecentAuthor, recentAuthors, type RecentAuthor } from "../recent-authors.js";

const composer = new Composer<Ctx>();

composer.on("message", async (ctx, next) => {
  if (!isGroup(ctx) || !ctx.from) {
    await next();
    return;
  }
  // Telegram can deliver the bot's own posts and other bot traffic. Consume
  // them quietly: neither belongs in the candidate cache nor merits fallback.
  if (ctx.from.is_bot || ctx.from.id === ctx.me.id) return;
  // Let explicit commands reach their command handlers; ambient group chat must
  // never fall through to the generic "didn't understand" reply.
  if (ctx.message.entities?.some((entity) => entity.type === "bot_command" && entity.offset === 0)) {
    await next();
    return;
  }
  let config;
  try {
    config = await getChatConfig(ctx);
  } catch {
    return;
  }
  if (!config) {
    return;
  }
  // Every human message is an independent opportunity. The bounded local cache
  // avoids a slow full-chat-member lookup when that opportunity wins.
  const sender: RecentAuthor = {
    id: ctx.from.id,
    ...(ctx.from.username ? { username: ctx.from.username } : {}),
    name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "a community member",
  };
  recentAuthors.remember(ctx.chat.id, sender);
  if (!config.enabled || !randomPercentHit(config.selection_chance)) {
    return;
  }

  // The sender has just entered the pool, so this fallback is defensive only.
  // It keeps a triggered draw instant even if a cache was cleared concurrently.
  const winner = chooseRecentAuthor(ctx.chat.id) ?? sender;
  const timestamp = now();
  config.last_draw_timestamp = timestamp;
  config.last_winner_id = winner.id;
  config.last_winner = winner;
  config.draws.push({ timestamp, winner_id: winner.id, chat_id: ctx.chat.id });
  await saveChatConfig(ctx, config);
  const mention = winner.username
    ? `@${winner.username}`
    : `<a href="tg://user?id=${winner.id}">${escapeHtml(winner.name)}</a>`;
  await ctx.reply(`🎁 Победитель: ${mention}!`, {
    parse_mode: winner.username ? undefined : "HTML",
    message_thread_id: ctx.message.message_thread_id,
  });
});

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default composer;

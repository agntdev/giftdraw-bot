import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getChatConfig, now, randomPercentHit, rememberMember, saveChatConfig } from "../gift-store.js";
import { isGroup } from "../gift-admin.js";

const composer = new Composer<Ctx>();

composer.on("message", async (ctx, next) => {
  if (!isGroup(ctx) || !ctx.from || ctx.from.is_bot || ctx.from.id === ctx.me.id) {
    await next();
    return;
  }
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
  rememberMember(config, {
    id: ctx.from.id,
    ...(ctx.from.username ? { username: ctx.from.username } : {}),
    name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "a community member",
  });
  if (!config.enabled || !randomPercentHit(config.selection_chance)) {
    await saveChatConfig(ctx, config);
    return;
  }
  const eligible = config.members.filter((member) => member.id !== ctx.me.id);
  if (eligible.length === 0) {
    await saveChatConfig(ctx, config);
    return;
  }
  const random = new Uint32Array(1);
  globalThis.crypto.getRandomValues(random);
  const winner = eligible[Math.floor(random[0]! / 0x1_0000_0000 * eligible.length)]!;
  const timestamp = now();
  config.last_draw_timestamp = timestamp;
  config.last_winner_id = winner.id;
  config.draws.push({ timestamp, winner_id: winner.id, chat_id: ctx.chat.id });
  await saveChatConfig(ctx, config);
  await ctx.reply(`🎁 Победитель: ${winner.username ? `@${winner.username}` : winner.name}!`, {
    message_thread_id: ctx.message.message_thread_id,
  });
});

export default composer;

import { Composer } from "grammy";
import { describe, expect, it } from "vitest";
import type { Ctx, Session } from "../src/bot.js";
import messageMonitoring from "../src/handlers/message-monitoring.js";
import { recentAuthors } from "../src/recent-authors.js";
import { createBot, parseBotSpec, runSpecs } from "../src/toolkit/index.js";

class GiftStoreStub {
  value: unknown = { enabled: true, selection_chance: 100, draws: [] };

  async fetch(input: string, init?: { method?: string; body?: string }): Promise<Response> {
    if (new URL(input).pathname !== "/gift") return new Response("not found", { status: 404 });
    if (init?.method === "PUT") {
      this.value = JSON.parse(init.body ?? "{}");
      return new Response(null, { status: 204 });
    }
    return Response.json(this.value);
  }
}

function botForDraws() {
  const store = new GiftStoreStub();
  const bot = createBot<Session>("test-token", { initial: () => ({}) });
  const attachEnv = new Composer<Ctx>();
  attachEnv.use((ctx, next) => {
    (ctx as Ctx & { env: { CHAT_DO: unknown } }).env = {
      CHAT_DO: {
        idFromName: (name: string) => name,
        get: () => store,
      },
    };
    return next();
  });
  bot.use(attachEnv);
  bot.use(messageMonitoring);
  return bot;
}

const humanMessage = (id: number, username: string) => ({
  update_id: id,
  message: {
    message_id: id,
    date: 0,
    chat: { id: -1001, type: "supergroup" as const, title: "Gift group" },
    from: { id, is_bot: false, first_name: username, username },
    text: "hello",
  },
});

describe("recent-author gift draws", () => {
  it("announces a draw immediately and permits the same person to win again", async () => {
    recentAuthors.clear();
    const suite = await runSpecs(botForDraws, [
      parseBotSpec({
        name: "repeat winners are allowed",
        steps: [
          {
            send: { update: humanMessage(7, "repeat_winner") },
            expect: [{ method: "sendMessage", payload: { text: "🎁 Победитель: @repeat_winner!" } }],
          },
          {
            send: { update: humanMessage(7, "repeat_winner") },
            expect: [{ method: "sendMessage", payload: { text: "🎁 Победитель: @repeat_winner!" } }],
          },
        ],
      }),
    ]);
    expect(suite.failed).toBe(0);
  });

  it("never draws from bot messages", async () => {
    recentAuthors.clear();
    const suite = await runSpecs(botForDraws, [
      parseBotSpec({
        name: "bots stay out of the pool",
        strict: true,
        steps: [
          {
            send: {
              update: {
                ...humanMessage(42, "test_bot"),
                message: {
                  ...humanMessage(42, "test_bot").message,
                  from: { id: 42, is_bot: true, first_name: "TestBot", username: "test_bot" },
                },
              },
            },
            expect: [],
          },
        ],
      }),
    ]);
    expect(suite.failed).toBe(0);
  });
});

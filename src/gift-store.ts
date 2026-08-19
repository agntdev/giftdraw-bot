import type { Ctx } from "./bot.js";

export interface GiftMember {
  id: number;
  username?: string;
  name: string;
}

export interface DrawEvent {
  timestamp: number;
  winner_id: number;
  chat_id: number;
}

export interface ChatConfig {
  enabled: boolean;
  selection_chance: number;
  last_draw_timestamp?: number;
  last_winner_id?: number;
  members: GiftMember[];
  draws: DrawEvent[];
}

const DEFAULT_CONFIG: ChatConfig = {
  enabled: false,
  selection_chance: 5,
  members: [],
  draws: [],
};

type GiftEnv = {
  CHAT_DO?: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(input: string, init?: { method?: string; body?: string }): Promise<Response> };
  };
};

function chatId(ctx: Ctx): number | undefined {
  return ctx.chat?.id;
}

function freshDefault(): ChatConfig {
  return { ...DEFAULT_CONFIG, members: [], draws: [] };
}

function normalize(value: unknown): ChatConfig {
  if (typeof value === "string") {
    try {
      return normalize(JSON.parse(value));
    } catch {
      return freshDefault();
    }
  }
  if (!value || typeof value !== "object") return freshDefault();
  const raw = value as Partial<ChatConfig>;
  return {
    enabled: raw.enabled === true,
    selection_chance:
      typeof raw.selection_chance === "number" && raw.selection_chance >= 0 && raw.selection_chance <= 100
        ? raw.selection_chance
        : 5,
    ...(typeof raw.last_draw_timestamp === "number" ? { last_draw_timestamp: raw.last_draw_timestamp } : {}),
    ...(typeof raw.last_winner_id === "number" ? { last_winner_id: raw.last_winner_id } : {}),
    members: Array.isArray(raw.members) ? raw.members.filter(validMember) : [],
    draws: Array.isArray(raw.draws) ? raw.draws.filter(validDraw) : [],
  };
}

function validMember(value: unknown): value is GiftMember {
  return !!value && typeof value === "object" && typeof (value as GiftMember).id === "number" &&
    typeof (value as GiftMember).name === "string";
}

function validDraw(value: unknown): value is DrawEvent {
  return !!value && typeof value === "object" && typeof (value as DrawEvent).timestamp === "number" &&
    typeof (value as DrawEvent).winner_id === "number" && typeof (value as DrawEvent).chat_id === "number";
}

async function workerStore(ctx: Ctx, method: "GET" | "PUT", value?: ChatConfig): Promise<ChatConfig | undefined> {
  const id = chatId(ctx);
  const env = (ctx as Ctx & { env?: GiftEnv }).env;
  if (!id || !env?.CHAT_DO) return undefined;
  const stub = env.CHAT_DO.get(env.CHAT_DO.idFromName(`chat:${id}`));
  const response = await stub.fetch("https://do/gift", {
    method,
    ...(value ? { body: JSON.stringify(value) } : {}),
  });
  if (!response.ok) throw new Error("persistent storage is unavailable");
  return method === "GET" ? normalize(await response.json()) : undefined;
}

async function access(ctx: Ctx, method: "GET" | "PUT", value?: ChatConfig): Promise<ChatConfig | undefined> {
  const fromWorker = await workerStore(ctx, method, value);
  if (fromWorker !== undefined || (ctx as Ctx & { env?: GiftEnv }).env?.CHAT_DO) return fromWorker;
  // The production runtime supplies CHAT_DO. Keeping this failure explicit is
  // safer than silently keeping gift records in process memory on Node.
  return undefined;
}

export async function getChatConfig(ctx: Ctx): Promise<ChatConfig | undefined> {
  return access(ctx, "GET");
}

export async function saveChatConfig(ctx: Ctx, config: ChatConfig): Promise<void> {
  await access(ctx, "PUT", normalize(config));
}

export function rememberMember(config: ChatConfig, member: GiftMember): void {
  const at = config.members.findIndex((existing) => existing.id === member.id);
  if (at >= 0) config.members[at] = member;
  else config.members.push(member);
}

let clock: () => number = () => Date.now();

/** The single clock seam for draw timestamps; tests may provide a fixed clock. */
export function now(): number {
  return clock();
}

export function setClockForTests(next?: () => number): void {
  clock = next ?? (() => Date.now());
}

export function randomPercentHit(percent: number): boolean {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return bytes[0]! / 0x1_0000_0000 < percent / 100;
}

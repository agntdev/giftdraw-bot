/**
 * A bounded, isolate-local cache of recent human authors for each chat.
 *
 * This is intentionally not durable domain data: it is only a fast candidate
 * pool for the next draw. Chat configuration and draw history remain in the
 * persistent store. Entries are moved to the newest position whenever their
 * author speaks, giving us LRU eviction without a member-list API call.
 */
export interface RecentAuthor {
  id: number;
  username?: string;
  name: string;
}

export const DEFAULT_RECENT_AUTHORS_CAPACITY = 1_000;

export class RecentAuthorsCache {
  private readonly chats = new Map<number, Map<number, RecentAuthor>>();

  constructor(private readonly capacity = DEFAULT_RECENT_AUTHORS_CAPACITY) {}

  remember(chatId: number, author: RecentAuthor): void {
    let authors = this.chats.get(chatId);
    if (!authors) {
      authors = new Map();
      this.chats.set(chatId, authors);
    }
    // Re-inserting refreshes the author's recency in insertion-ordered Map.
    authors.delete(author.id);
    authors.set(author.id, author);
    while (authors.size > this.capacity) {
      const oldest = authors.keys().next().value;
      if (oldest === undefined) break;
      authors.delete(oldest);
    }
  }

  candidates(chatId: number): RecentAuthor[] {
    return [...(this.chats.get(chatId)?.values() ?? [])];
  }

  clear(): void {
    this.chats.clear();
  }
}

export const recentAuthors = new RecentAuthorsCache();

export function chooseRecentAuthor(chatId: number): RecentAuthor | undefined {
  const candidates = recentAuthors.candidates(chatId);
  if (candidates.length === 0) return undefined;
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return candidates[Math.floor((bytes[0]! / 0x1_0000_0000) * candidates.length)];
}

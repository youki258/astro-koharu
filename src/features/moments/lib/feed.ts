import type { PublicMessage } from '@coszone/koharu-astro';
import type { NormalizedMomentsConfig } from '@lib/config/moments';
import { countPublishableGroups, publishHashtags } from './publish-filter';

const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_PAGES = 8;

export interface MomentFeedPage {
  items: readonly PublicMessage[];
  nextCursor: string | null;
}

export type MomentFeedFetcher = (cursor: string | undefined, limit: number) => Promise<MomentFeedPage>;

export interface MomentFeedOptions {
  cursor?: string;
  limit?: number;
  maxPages?: number;
  fetchPage: MomentFeedFetcher;
}

export interface MomentFeed {
  messages: PublicMessage[];
  nextCursor: string | null;
  /** True when the page cap stopped collection before a full page of publishable messages was found. */
  capped: boolean;
}

/**
 * Collects one display page of publishable messages. The suite paginates raw channel messages, so with an
 * active publish filter this keeps following opaque cursors until the page is full or the page budget ends.
 * The whole accumulated raw page set is returned so the caller can still apply album boundary separation.
 */
export async function collectPublishableFeed(config: NormalizedMomentsConfig, options: MomentFeedOptions): Promise<MomentFeed> {
  const { cursor, fetchPage, limit = DEFAULT_LIMIT, maxPages = DEFAULT_MAX_PAGES } = options;

  if (!publishHashtags(config)) {
    const page = await fetchPage(cursor, limit);
    return { messages: [...page.items], nextCursor: page.nextCursor, capped: false };
  }

  const messages: PublicMessage[] = [];
  let nextCursor: string | null = null;
  let current: string | undefined = cursor;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage(current, limit);
    messages.push(...result.items);
    nextCursor = result.nextCursor;
    current = result.nextCursor ?? undefined;
    if (!nextCursor) return { messages, nextCursor: null, capped: false };
    if (countPublishableGroups(config, messages) >= limit) return { messages, nextCursor, capped: false };
  }

  return { messages, nextCursor, capped: true };
}

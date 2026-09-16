import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicMessage } from '@coszone/koharu-astro';
import { collectPublishableFeed } from '../../src/features/moments/lib/feed';
import { normalizeMomentsConfig } from '../../src/lib/config/moments';

function message(text: string | null, sourceId: number): PublicMessage {
  return {
    id: `018f3f7a-2b1c-7def-8abc-${String(sourceId).padStart(12, '0')}`,
    channel: { id: '550e8400-e29b-41d4-a716-446655440000', title: 'Daily', username: 'daily_channel' },
    content: { kind: text ? 'text' : 'none', text, html: text ? `<p>${text}</p>` : null, entities: [] },
    media: [],
    mediaGroupId: null,
    authorSignature: null,
    publishedAt: '2026-07-31T06:23:35.000Z',
    revision: 1,
    sourceUrl: `https://t.me/daily_channel/${sourceId}`,
  };
}

interface FakePage {
  items: PublicMessage[];
  nextCursor: string | null;
}

function fakeFetcher(pages: FakePage[]) {
  const requests: { cursor: string | undefined; limit: number }[] = [];
  return {
    requests,
    fetchPage: async (cursor: string | undefined, limit: number) => {
      requests.push({ cursor, limit });
      return pages[requests.length - 1] ?? { items: [], nextCursor: null };
    },
  };
}

const config = normalizeMomentsConfig({ enabled: true, filter: { hashtags: ['#碎碎念'] } });
const suitePage = (from: number, to: number, nextCursor: string | null): FakePage => ({
  items: Array.from({ length: to - from + 1 }, (_, index) =>
    message(index % 4 === 0 ? `#碎碎念 ${index}` : `普通消息 ${index}`, index + 1),
  ),
  nextCursor,
});

test('without a filter it forwards a single suite page untouched', async () => {
  const { requests, fetchPage } = fakeFetcher([suitePage(0, 1, 'next-1')]);
  const feed = await collectPublishableFeed(normalizeMomentsConfig({ enabled: true }), {
    cursor: 'start',
    limit: 2,
    fetchPage,
  });
  assert.deepEqual(requests, [{ cursor: 'start', limit: 2 }]);
  assert.deepEqual(
    feed.messages.map((item) => item.id),
    [message(null, 1).id, message(null, 2).id],
  );
  assert.equal(feed.nextCursor, 'next-1');
  assert.equal(feed.capped, false);
});

test('keeps following cursors until the display page is full', async () => {
  const { requests, fetchPage } = fakeFetcher([suitePage(0, 3, 'next-1'), suitePage(4, 7, 'next-2')]);
  const feed = await collectPublishableFeed(config, { cursor: undefined, limit: 2, fetchPage });

  assert.deepEqual(requests, [
    { cursor: undefined, limit: 2 },
    { cursor: 'next-1', limit: 2 },
  ]);
  assert.equal(feed.messages.length, 8);
  assert.equal(feed.nextCursor, 'next-2');
  assert.equal(feed.capped, false);
});

test('stops as soon as one suite page already yields a full display page', async () => {
  const items = Array.from({ length: 2 }, (_, index) => message(`#碎碎念 ${index}`, index + 1));
  const { requests, fetchPage } = fakeFetcher([{ items, nextCursor: 'next-1' }]);
  const feed = await collectPublishableFeed(config, { limit: 2, fetchPage });
  assert.equal(requests.length, 1);
  assert.equal(feed.nextCursor, 'next-1');
});

test('returns the collected remainder when the page budget runs out', async () => {
  const { requests, fetchPage } = fakeFetcher(
    Array.from({ length: 5 }, (_, index) => ({
      items: Array.from({ length: 10 }, (_, offset) =>
        message(offset % 10 === 0 ? `#碎碎念 ${index * 10}` : `普通消息 ${index * 10 + offset}`, index * 10 + offset + 1),
      ),
      nextCursor: `next-${index + 1}`,
    })),
  );
  const feed = await collectPublishableFeed(config, { limit: 5, maxPages: 2, fetchPage });
  assert.equal(requests.length, 2);
  assert.equal(feed.messages.length, 20);
  assert.equal(feed.nextCursor, 'next-2');
  assert.equal(feed.capped, true);
});

test('returns the whole channel when the suite cursor ends', async () => {
  const { requests, fetchPage } = fakeFetcher([suitePage(0, 1, null), suitePage(2, 3, null)]);
  const feed = await collectPublishableFeed(config, { limit: 2, fetchPage });
  assert.equal(requests.length, 1);
  assert.equal(feed.messages.length, 2);
  assert.equal(feed.nextCursor, null);
  assert.equal(feed.capped, false);
});

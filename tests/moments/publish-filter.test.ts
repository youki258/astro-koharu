import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicMessage } from '@coszone/koharu-astro';
import { groupMomentMessages } from '../../src/features/moments/lib/message-groups';
import {
  countPublishableGroups,
  filterPublishableGroups,
  isPublishableMessage,
  isPublishableReference,
  publishHashtags,
} from '../../src/features/moments/lib/publish-filter';
import { normalizeMomentsConfig } from '../../src/lib/config/moments';

const tagged = '#碎碎念 今天又是元气满满的一天';
const untagged = '转发一条新闻';

function message(text: string | null, sourceId = 1, mediaGroupId: string | null = null): PublicMessage {
  return {
    id: `018f3f7a-2b1c-7def-8abc-${String(sourceId).padStart(12, '0')}`,
    channel: { id: '550e8400-e29b-41d4-a716-446655440000', title: 'Daily', username: 'daily_channel' },
    content: { kind: text ? 'text' : 'none', text, html: text ? `<p>${text}</p>` : null, entities: [] },
    media: [],
    mediaGroupId,
    authorSignature: null,
    publishedAt: '2026-07-31T06:23:35.000Z',
    revision: 1,
    sourceUrl: `https://t.me/daily_channel/${sourceId}`,
  };
}

const config = normalizeMomentsConfig({ enabled: true, filter: { hashtags: ['#碎碎念'] } });

test('an absent or empty filter publishes everything', () => {
  const disabled = normalizeMomentsConfig({ enabled: true });
  assert.equal(publishHashtags(disabled), undefined);
  assert.equal(isPublishableMessage(disabled, message(untagged)), true);
  assert.equal(countPublishableGroups(disabled, [message(untagged), message(untagged, 2)]), 2);
});

test('publishes only messages whose own text starts with a configured hashtag', () => {
  assert.equal(isPublishableMessage(config, message(tagged)), true);
  assert.equal(isPublishableMessage(config, message(' #碎碎念 缩进后仍算开头')), true);
  assert.equal(isPublishableMessage(config, message(untagged)), false);
  assert.equal(isPublishableMessage(config, message('看这条 #碎碎念 在中间')), false);
  assert.equal(isPublishableMessage(config, message('#碎碎念2 是另一个标签')), false);
  assert.equal(isPublishableMessage(config, message(null)), false);
});

test('matches hashtags without case sensitivity', () => {
  const latin = normalizeMomentsConfig({ enabled: true, filter: { hashtags: ['Daily'] } });
  assert.equal(isPublishableMessage(latin, message('#daily notes')), true);
  assert.equal(isPublishableMessage(latin, message('#dailyly notes')), false);
});

test('keeps a whole album when its captioned member matches', () => {
  const albumId = 'album-1';
  const caption = message('#碎碎念 带图的日常', 1, albumId);
  const member = message(null, 2, albumId);
  const lone = message(null, 3);

  const groups = groupMomentMessages([caption, member, lone]);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    filterPublishableGroups(config, groups).map((group) => group.primary.id),
    [caption.id],
  );
  assert.equal(countPublishableGroups(config, [caption, member, lone]), 1);
});

test('filters context references by their preview text', () => {
  assert.equal(isPublishableReference(config, { preview: tagged }), true);
  assert.equal(isPublishableReference(config, { preview: untagged }), false);
  assert.equal(isPublishableReference(config, { preview: null }), false);
  assert.equal(isPublishableReference(config, null), false);
  assert.equal(isPublishableReference(normalizeMomentsConfig({ enabled: true }), { preview: null }), true);
});

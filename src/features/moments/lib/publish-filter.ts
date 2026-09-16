import type { MessageContextReference, PublicMessage } from '@coszone/koharu-astro';
import type { NormalizedMomentsConfig } from '@lib/config/moments';
import { groupMomentMessages, type MomentMessageGroup } from './message-groups';

/** A hashtag label cannot be followed by another hashtag word character, mirroring the tag chip extractor. */
const HASHTAG_TAIL = /[\p{L}\p{N}_]/u;

export function publishHashtags(config: NormalizedMomentsConfig): readonly string[] | undefined {
  const hashtags = config.filter?.hashtags;
  return hashtags && hashtags.length > 0 ? hashtags : undefined;
}

function startsWithPublishHashtag(text: string | null | undefined, hashtags: readonly string[] | undefined): boolean {
  if (!hashtags) return true;
  const plain = text?.trim() ?? '';
  for (const hashtag of hashtags) {
    if (!plain.toLowerCase().startsWith(hashtag.toLowerCase())) continue;
    const tail = plain.charAt(hashtag.length);
    if (tail === '' || !HASHTAG_TAIL.test(tail)) return true;
  }
  return false;
}

/** A message is publishable when the filter is off, or when its own text starts with a configured hashtag. */
export function isPublishableMessage(config: NormalizedMomentsConfig, message: PublicMessage): boolean {
  return startsWithPublishHashtag(message.content.text, publishHashtags(config));
}

/** Context references only carry a truncated preview, so filter on the same prefix. */
export function isPublishableReference(
  config: NormalizedMomentsConfig,
  reference: Pick<MessageContextReference, 'preview'> | null | undefined,
): boolean {
  if (!reference) return false;
  return startsWithPublishHashtag(reference.preview, publishHashtags(config));
}

/** A group (album) stays publishable as a whole when any member matches, so albums never lose media. */
export function isPublishableGroup(config: NormalizedMomentsConfig, group: MomentMessageGroup): boolean {
  const hashtags = publishHashtags(config);
  if (!hashtags) return true;
  return group.messages.some((message) => startsWithPublishHashtag(message.content.text, hashtags));
}

export function filterPublishableGroups(
  config: NormalizedMomentsConfig,
  groups: readonly MomentMessageGroup[],
): MomentMessageGroup[] {
  return groups.filter((group) => isPublishableGroup(config, group));
}

export function countPublishableGroups(config: NormalizedMomentsConfig, messages: readonly PublicMessage[]): number {
  if (!publishHashtags(config)) return messages.length;
  return filterPublishableGroups(config, groupMomentMessages(messages)).length;
}

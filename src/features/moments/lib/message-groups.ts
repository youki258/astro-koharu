import type { PublicMessage } from '@coszone/koharu-astro';

const TELEGRAM_ALBUM_LIMIT = 10;

/** Telegram assigns album members near-identical timestamps that can straddle a second boundary. */
const DESKTOP_ALBUM_TIMESTAMP_TOLERANCE_MS = 2_000;

export interface MomentMessageGroup {
  anchor: PublicMessage;
  messages: readonly PublicMessage[];
  primary: PublicMessage;
}

export interface GroupMomentMessagesOptions {
  /** The first API item may continue an album from the previous cursor page. */
  separateFirst?: boolean;
  /** The last API item may continue an album on the next cursor page. */
  separateLast?: boolean;
}

interface TelegramSourceMessage {
  channel: string;
  id: bigint;
}

function hasVisibleBody(message: PublicMessage): boolean {
  return Boolean(message.content.text?.trim() || message.content.html?.trim());
}

function telegramSourceMessage(message: PublicMessage): TelegramSourceMessage | undefined {
  if (!message.sourceUrl) return undefined;

  let url: URL;
  try {
    url = new URL(message.sourceUrl);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'https:' || !['t.me', 'www.t.me'].includes(url.hostname.toLowerCase())) return undefined;
  const match = url.pathname.match(/^\/([^/]+)\/(\d+)\/?$/u);
  if (!match) return undefined;

  return {
    channel: match[1].toLowerCase(),
    id: BigInt(match[2]),
  };
}

function stableGroupAnchor(messages: readonly PublicMessage[]): PublicMessage | undefined {
  const first = messages[0];
  if (!first) return undefined;
  const sources = messages.map(telegramSourceMessage);
  const firstSource = sources[0];
  if (firstSource && sources.every((source) => source?.channel === firstSource.channel)) {
    return messages.slice(1).reduce((anchor, candidate, index) => {
      const anchorSource = telegramSourceMessage(anchor);
      const candidateSource = sources[index + 1];
      return anchorSource && candidateSource && candidateSource.id < anchorSource.id ? candidate : anchor;
    }, first);
  }

  return messages
    .slice(1)
    .reduce((anchor, candidate) => (candidate.id.localeCompare(anchor.id) < 0 ? candidate : anchor), first);
}

function withinDesktopAlbumTimestamp(a: string, b: string): boolean {
  const difference = Math.abs(Date.parse(a) - Date.parse(b));
  return Number.isFinite(difference) && difference <= DESKTOP_ALBUM_TIMESTAMP_TOLERANCE_MS;
}

function toGroup(messages: readonly PublicMessage[]): MomentMessageGroup {
  const anchor = stableGroupAnchor(messages);
  if (!anchor) throw new TypeError('Moment message groups cannot be empty.');
  const primary = messages.find(hasVisibleBody) ?? anchor;
  return {
    anchor,
    messages,
    primary,
  };
}

function separateBoundaryGroups(groups: readonly PublicMessage[][], options: GroupMomentMessagesOptions): PublicMessage[][] {
  return groups.flatMap((messages, index) => {
    const isProtectedBoundary = (index === 0 && options.separateFirst) || (index === groups.length - 1 && options.separateLast);
    return isProtectedBoundary && messages.length > 1 ? messages.map((message) => [message]) : [messages];
  });
}

/**
 * The suite orders same-timestamp messages by their opaque suite UUID, so Desktop-imported album members can
 * arrive shuffled, and one album's members can straddle a second boundary. Clustering therefore matches members
 * by (channel, consecutive source ID, near-identical timestamps) instead of relying on input adjacency, while
 * explicit mediaGroupId members may appear anywhere in the input.
 */
interface DesktopChain {
  members: PublicMessage[];
  firstPublishedAt: string;
  bodyCount: number;
}

function canJoinDesktopChain(chain: DesktopChain, candidate: PublicMessage, source: TelegramSourceMessage): boolean {
  const previous = chain.members.at(-1);
  if (!previous) return false;
  const previousSource = telegramSourceMessage(previous);
  if (!previousSource || previousSource.channel !== source.channel) return false;
  const difference = source.id - previousSource.id;
  if (difference !== 1n && difference !== -1n) return false;
  if (!withinDesktopAlbumTimestamp(chain.firstPublishedAt, candidate.publishedAt)) return false;
  if (chain.members.length >= TELEGRAM_ALBUM_LIMIT) return false;
  if (candidate.media.length === 0) return false;
  return chain.bodyCount + Number(hasVisibleBody(candidate)) <= 1;
}

function clusterMessages(messages: readonly PublicMessage[]): PublicMessage[][] {
  const clusters: PublicMessage[][] = [];
  const explicitClusters = new Map<string, PublicMessage[]>();
  const desktopCandidates: { message: PublicMessage; source: TelegramSourceMessage }[] = [];

  for (const message of messages) {
    if (message.mediaGroupId !== null) {
      const key = `${message.channel.id}:${message.mediaGroupId}`;
      let cluster = explicitClusters.get(key);
      if (!cluster) {
        cluster = [];
        explicitClusters.set(key, cluster);
        clusters.push(cluster);
      }
      cluster.push(message);
      continue;
    }
    const source = telegramSourceMessage(message);
    if (source && message.media.length > 0) {
      desktopCandidates.push({ message, source });
      continue;
    }
    clusters.push([message]);
  }

  desktopCandidates.sort((a, b) => {
    if (a.source.channel !== b.source.channel) return a.source.channel < b.source.channel ? -1 : 1;
    if (a.source.id !== b.source.id) return a.source.id < b.source.id ? -1 : 1;
    return 0;
  });
  const desktopChains: DesktopChain[] = [];
  for (const { message, source } of desktopCandidates) {
    const chain = desktopChains.at(-1);
    const lastSource = chain ? telegramSourceMessage(chain.members.at(-1) ?? message) : undefined;
    if (chain && lastSource && canJoinDesktopChain(chain, message, source) && source.id - lastSource.id === 1n) {
      chain.members.push(message);
      chain.bodyCount += Number(hasVisibleBody(message));
    } else {
      desktopChains.push({
        members: [message],
        firstPublishedAt: message.publishedAt,
        bodyCount: Number(hasVisibleBody(message)),
      });
    }
  }
  clusters.push(...desktopChains.map((chain) => chain.members));

  return clusters.map(orderClusterMembers).sort((a, b) => {
    const timeA = Math.max(...a.map((message) => Date.parse(message.publishedAt)));
    const timeB = Math.max(...b.map((message) => Date.parse(message.publishedAt)));
    if (timeA !== timeB) return timeA < timeB ? 1 : -1;
    return 0;
  });
}

/** Render album media in Telegram posting order even when the suite shuffles same-timestamp members. */
function orderClusterMembers(members: PublicMessage[]): PublicMessage[] {
  const sources = members.map(telegramSourceMessage);
  const channel = sources[0]?.channel;
  if (!channel || sources.some((source) => source?.channel !== channel)) return members;
  return members
    .map((message, index) => ({ message, index, source: sources[index] }))
    .sort((a, b) => {
      const sourceA = a.source;
      const sourceB = b.source;
      if (!sourceA || !sourceB) return a.index - b.index;
      if (sourceA.id !== sourceB.id) return sourceA.id < sourceB.id ? -1 : 1;
      return a.index - b.index;
    })
    .map((item) => item.message);
}

/**
 * Groups Telegram album members without changing their stable Suite identities.
 * Desktop JSON omits media_group_id, so the fallback deliberately requires every signal that
 * survives export: near-identical timestamps, consecutive source IDs, media on every member,
 * and at most one caption.
 */
export function groupMomentMessages(
  messages: readonly PublicMessage[],
  options: GroupMomentMessagesOptions = {},
): MomentMessageGroup[] {
  return separateBoundaryGroups(clusterMessages(messages), options).map(toGroup);
}

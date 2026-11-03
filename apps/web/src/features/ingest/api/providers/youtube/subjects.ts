import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { withRelations } from "#/features/ingest/api/providers/observe";

import type { YoutubePlaylistItem, YoutubeSubscription, YoutubeVideo } from "./schemas";

const ORIGIN = "https://www.youtube.com";
const MAX_TAGS = 10;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const NO_SECONDS = 0;
const ISO_DURATION = String.raw`^PT(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?$`;
const CLOCK_DURATION = String.raw`^(?:(?<hours>\d+):)?(?<minutes>\d+):(?<seconds>\d{2})$`;

type Channel = Readonly<{ id: string; title: string }>;

type VideoParts = Readonly<{
  id: string;
  title: string;
  channel: Option.Option<Channel>;
  durationSec: Option.Option<number>;
  publishedAt: Option.Option<string>;
  tags: readonly string[];
}>;

const numberOf = (text: string | undefined): number =>
  pipe(
    Option.fromUndefinedOr(text),
    Option.map(Number),
    Option.getOrElse(() => NO_SECONDS),
  );

const secondsOf = (
  source: string,
): ((text: string | null | undefined) => Option.Option<number>) => {
  const pattern = new RegExp(source, "u");
  const matchOf = (value: string): Option.Option<RegExpExecArray> =>
    Option.fromNullishOr(pattern.exec(value));
  return (text) =>
    pipe(
      Option.fromNullishOr(text),
      Option.flatMap(matchOf),
      Option.flatMap(({ groups }) => Option.fromUndefinedOr(groups)),
      Option.map(
        ({ hours, minutes, seconds }) =>
          numberOf(hours) * SECONDS_PER_HOUR +
          numberOf(minutes) * SECONDS_PER_MINUTE +
          numberOf(seconds),
      ),
    );
};

const isoSecondsOf = secondsOf(ISO_DURATION);

const clockSecondsOf = secondsOf(CLOCK_DURATION);

const channelCreatorOf = ({ id, title }: Channel): CreatorInput => ({
  provider: "youtube",
  externalId: id,
  type: "channel",
  title,
  url: `${ORIGIN}/channel/${id}`,
});

const channelOf = ({
  id,
  title,
}: Readonly<{
  id: string | null | undefined;
  title: string | null | undefined;
}>): Option.Option<Channel> =>
  Option.all({ id: Option.fromNullishOr(id), title: Option.fromNullishOr(title) });

const publishedOf = (publishedAt: Option.Option<string>): Readonly<{ publishedAtMs?: number }> =>
  pipe(
    publishedAt,
    Option.map((text) => Date.parse(text)),
    Option.filter(Number.isFinite),
    Option.map((publishedAtMs) => ({ publishedAtMs })),
    Option.getOrElse(() => ({})),
  );

const durationOf = (durationSec: Option.Option<number>): Readonly<{ durationSec?: number }> =>
  pipe(
    durationSec,
    Option.map((seconds) => ({ durationSec: seconds })),
    Option.getOrElse(() => ({})),
  );

const videoSubjectOf = (parts: VideoParts): SubjectInput => ({
  provider: "youtube",
  externalId: parts.id,
  type: "video",
  title: parts.title,
  url: `${ORIGIN}/watch?v=${parts.id}`,
  ...durationOf(parts.durationSec),
  ...publishedOf(parts.publishedAt),
  credits: pipe(parts.channel, Option.map(channelCreatorOf), Option.toArray),
  tags: pipe(parts.tags, Arr.take(MAX_TAGS)),
});

const likedVideoOf = ({ id, snippet, contentDetails }: YoutubeVideo): SubjectInput =>
  videoSubjectOf({
    id,
    title: snippet.title,
    channel: channelOf({ id: snippet.channelId, title: snippet.channelTitle }),
    durationSec: pipe(
      Option.fromNullishOr(contentDetails),
      Option.flatMap(({ duration }) => isoSecondsOf(duration)),
    ),
    publishedAt: Option.fromNullishOr(snippet.publishedAt),
    tags: pipe(
      Option.fromNullishOr(snippet.tags),
      Option.getOrElse((): readonly string[] => []),
    ),
  });

const playlistVideoOf = ({
  snippet,
  contentDetails,
}: YoutubePlaylistItem): Option.Option<SubjectInput> =>
  pipe(
    Option.all({
      id: Option.fromNullishOr(snippet.resourceId.videoId),
      channel: channelOf({
        id: snippet.videoOwnerChannelId,
        title: snippet.videoOwnerChannelTitle,
      }),
    }),
    Option.map(({ id, channel }) =>
      videoSubjectOf({
        id,
        title: snippet.title,
        channel: Option.some(channel),
        durationSec: Option.none(),
        publishedAt: pipe(
          Option.fromNullishOr(contentDetails),
          Option.flatMap(({ videoPublishedAt }) => Option.fromNullishOr(videoPublishedAt)),
        ),
        tags: [],
      }),
    ),
  );

const subscribedChannelOf = ({ snippet }: YoutubeSubscription): Option.Option<SubjectInput> =>
  pipe(
    channelOf({ id: snippet.resourceId.channelId, title: snippet.title }),
    Option.map(channelCreatorOf),
    Option.map(withRelations({ credits: [], tags: [] })),
  );

export type { Channel, VideoParts };
export {
  channelOf,
  clockSecondsOf,
  isoSecondsOf,
  likedVideoOf,
  playlistVideoOf,
  subscribedChannelOf,
  videoSubjectOf,
};

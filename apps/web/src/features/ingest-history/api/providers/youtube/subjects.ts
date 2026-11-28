import { Array as Arr, Match, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { withoutRelations } from "#/features/ingest-history/api/providers/creator-input";
import { orEmpty, videoIn } from "#/features/ingest-history/api/providers/subject-in";

import type { YoutubePlaylistItem, YoutubeSubscription, YoutubeVideo } from "./schemas.ts";

const ORIGIN = "https://www.youtube.com";
const MAX_TAGS = 10;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const NO_SECONDS = 0;
const ISO_DURATION = /^PT(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?$/u;
const CLOCK_DURATION = /^(?:(?<hours>\d+):)?(?<minutes>\d+):(?<seconds>\d{2})$/u;

export type Channel = Readonly<{ id: string; title: string }>;

export type VideoParts = Readonly<{
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
  exec: (value: string) => RegExpExecArray | null,
): ((text: string | null | undefined) => Option.Option<number>) => {
  const matchOf = (value: string): Option.Option<RegExpExecArray> =>
    Option.fromNullishOr(exec(value));
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

const isoSecondsOf = secondsOf((value) => ISO_DURATION.exec(value));

export const clockSecondsOf = secondsOf((value) => CLOCK_DURATION.exec(value));

const channelCreatorOf = ({ id, title }: Channel): CreatorInput => ({
  provider: "youtube",
  type: "channel",
  externalId: id,
  title,
  url: `${ORIGIN}/channel/${id}`,
});

export const channelOf = ({
  id,
  title,
}: Readonly<{
  id: string | null | undefined;
  title: string | null | undefined;
}>): Option.Option<Channel> =>
  Option.all({ id: Option.fromNullishOr(id), title: Option.fromNullishOr(title) });

const youtubeVideoOf = videoIn({ provider: "youtube", watchUrl: `${ORIGIN}/watch?v=` });

export const videoSubjectOf = ({ channel, tags, ...parts }: VideoParts): SubjectInput =>
  youtubeVideoOf({
    ...parts,
    credits: pipe(channel, Option.map(channelCreatorOf), Option.toArray),
    tags: pipe(tags, Arr.take(MAX_TAGS)),
  });

const isVideo = (item: YoutubeVideo | YoutubePlaylistItem): item is YoutubeVideo => "id" in item;

const partsOf = (item: YoutubeVideo | YoutubePlaylistItem): Option.Option<VideoParts> =>
  Match.value(item).pipe(
    Match.when(isVideo, ({ id, snippet, contentDetails }) =>
      Option.some({
        id,
        title: snippet.title,
        channel: channelOf({ id: snippet.channelId, title: snippet.channelTitle }),
        durationSec: pipe(
          Option.fromNullishOr(contentDetails),
          Option.flatMap(({ duration }) => isoSecondsOf(duration)),
        ),
        publishedAt: Option.fromNullishOr(snippet.publishedAt),
        tags: orEmpty(snippet.tags),
      }),
    ),
    Match.orElse(({ snippet, contentDetails }) =>
      pipe(
        Option.all({
          id: Option.fromNullishOr(snippet.resourceId.videoId),
          channel: channelOf({
            id: snippet.videoOwnerChannelId,
            title: snippet.videoOwnerChannelTitle,
          }),
        }),
        Option.map(({ id, channel }) => ({
          id,
          title: snippet.title,
          channel: Option.some(channel),
          durationSec: Option.none(),
          publishedAt: pipe(
            Option.fromNullishOr(contentDetails),
            Option.flatMap(({ videoPublishedAt }) => Option.fromNullishOr(videoPublishedAt)),
          ),
          tags: [],
        })),
      ),
    ),
  );

export const videoOf = (item: YoutubeVideo | YoutubePlaylistItem): Option.Option<SubjectInput> =>
  pipe(partsOf(item), Option.map(videoSubjectOf));

export const subscribedChannelOf = ({
  snippet,
}: YoutubeSubscription): Option.Option<SubjectInput> =>
  pipe(
    channelOf({ id: snippet.resourceId.channelId, title: snippet.title }),
    Option.map(channelCreatorOf),
    Option.map(withoutRelations),
  );

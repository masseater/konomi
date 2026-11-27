import { Array as Arr, DateTime, Match, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorMapper, personMapper } from "#/features/ingest-history/api/providers/observe";

import type { VideoEntry } from "./schemas";

const WATCH_URL = "https://www.nicovideo.jp/watch/";
const USER_URL = "https://www.nicovideo.jp/user/";
const CHANNEL_URL = "https://ch.nicovideo.jp/";

const epochMillisOf = (text: string): Option.Option<number> =>
  pipe(DateTime.make(text), Option.map(DateTime.toEpochMillis));

export const personOf = personMapper({ provider: "niconico", idPrefix: "", urlBase: USER_URL });

const channelOf = creatorMapper("channel")({
  provider: "niconico",
  idPrefix: "",
  urlBase: CHANNEL_URL,
});

const ownerOf = ({ video }: VideoEntry): readonly CreatorInput[] => {
  const owner = Option.fromNullishOr(video.owner);
  const id = pipe(
    owner,
    Option.flatMap((found) => Option.fromNullishOr(found.id)),
  );
  const name = pipe(
    owner,
    Option.flatMap((found) => Option.fromNullishOr(found.name)),
  );
  const ownerType = pipe(
    owner,
    Option.flatMap((found) => Option.fromNullishOr(found.ownerType)),
    Option.getOrElse(() => "user"),
  );
  return pipe(
    Option.all({ id, name }),
    Option.map((named) =>
      Match.value(ownerType).pipe(
        Match.when("channel", () => channelOf(named)),
        Match.orElse(() => personOf(named)),
      ),
    ),
    Arr.fromOption,
  );
};

const optionalFields = ({
  video,
}: VideoEntry): Readonly<{ durationSec?: number; publishedAtMs?: number }> => {
  const duration = pipe(
    Option.fromNullishOr(video.duration),
    Option.map((durationSec) => ({ durationSec })),
    Option.getOrElse(() => ({})),
  );
  const published = pipe(
    Option.fromNullishOr(video.registeredAt),
    Option.flatMap(epochMillisOf),
    Option.map((publishedAtMs) => ({ publishedAtMs })),
    Option.getOrElse(() => ({})),
  );
  return { ...duration, ...published };
};

export const videoSubjectOf = (entry: VideoEntry): SubjectInput => ({
  provider: "niconico",
  externalId: entry.video.id,
  type: "video",
  title: entry.video.title,
  url: `${WATCH_URL}${entry.video.id}`,
  ...optionalFields(entry),
  credits: ownerOf(entry),
  tags: [],
});

export const stampOf = ({
  entry,
  fallback,
}: Readonly<{ entry: VideoEntry; fallback: number }>): number =>
  pipe(
    [entry.lastViewedAt, entry.likedAt, entry.addedAt],
    Arr.map(Option.fromNullishOr),
    Option.firstSomeOf,
    Option.flatMap(epochMillisOf),
    Option.getOrElse(() => fallback),
  );

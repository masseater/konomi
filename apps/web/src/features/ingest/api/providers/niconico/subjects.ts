import { Array as Arr, DateTime, Match, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";

import type { VideoEntry } from "./schemas";

const WATCH_URL = "https://www.nicovideo.jp/watch/";
const USER_URL = "https://www.nicovideo.jp/user/";
const CHANNEL_URL = "https://ch.nicovideo.jp/";

const epochMillisOf = (text: string): Option.Option<number> =>
  pipe(DateTime.make(text), Option.map(DateTime.toEpochMillis));

const personOf = ({ id, name }: Readonly<{ id: string; name: string }>): CreatorInput => ({
  provider: "niconico",
  externalId: id,
  type: "person",
  title: name,
  url: `${USER_URL}${id}`,
});

const channelOf = ({ id, name }: Readonly<{ id: string; name: string }>): CreatorInput => ({
  provider: "niconico",
  externalId: id,
  type: "channel",
  title: name,
  url: `${CHANNEL_URL}${id}`,
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

const videoSubjectOf = (entry: VideoEntry): SubjectInput => ({
  provider: "niconico",
  externalId: entry.video.id,
  type: "video",
  title: entry.video.title,
  url: `${WATCH_URL}${entry.video.id}`,
  ...optionalFields(entry),
  credits: ownerOf(entry),
  tags: [],
});

const stampOf = ({ entry, fallback }: Readonly<{ entry: VideoEntry; fallback: number }>): number =>
  pipe(
    [entry.lastViewedAt, entry.likedAt, entry.addedAt],
    Arr.map(Option.fromNullishOr),
    Option.firstSomeOf,
    Option.flatMap(epochMillisOf),
    Option.getOrElse(() => fallback),
  );

export { personOf, stampOf, videoSubjectOf };

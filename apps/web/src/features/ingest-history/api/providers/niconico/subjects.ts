import { Array as Arr, Match, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorMapper, personMapper } from "#/features/ingest-history/api/providers/creator-input";
import { parsedEpoch } from "#/features/ingest-history/api/providers/epoch";
import { durationOf, publishedOf } from "#/features/ingest-history/api/providers/subject-fields";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { VideoEntry } from "./schemas";

const WATCH_URL = "https://www.nicovideo.jp/watch/";
const USER_URL = "https://www.nicovideo.jp/user/";
const CHANNEL_URL = "https://ch.nicovideo.jp/";

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

export const videoSubjectOf = (entry: VideoEntry): SubjectInput =>
  subjectIn("niconico")({
    externalId: entry.video.id,
    type: "video",
    title: entry.video.title,
    url: `${WATCH_URL}${entry.video.id}`,
    ...durationOf(Option.fromNullishOr(entry.video.duration)),
    ...publishedOf(Option.fromNullishOr(entry.video.registeredAt)),
    credits: ownerOf(entry),
  });

export const stampOf = ({
  entry,
  fallback,
}: Readonly<{ entry: VideoEntry; fallback: number }>): number =>
  pipe(
    [entry.lastViewedAt, entry.likedAt, entry.addedAt],
    Arr.map(Option.fromNullishOr),
    Option.firstSomeOf,
    parsedEpoch,
    Option.getOrElse(() => fallback),
  );

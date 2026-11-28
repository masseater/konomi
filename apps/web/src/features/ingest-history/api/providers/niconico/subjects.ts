import { Array as Arr, Match, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorFrom, linkedBy } from "#/features/ingest-history/api/providers/creator-input";
import { videoIn } from "#/features/ingest-history/api/providers/subject-in";

import type { VideoEntry } from "./schemas.ts";

const WATCH_URL = "https://www.nicovideo.jp/watch/";
const USER_URL = "https://www.nicovideo.jp/user/";
const CHANNEL_URL = "https://ch.nicovideo.jp/";

export const personOf = creatorFrom({ provider: "niconico" })(
  linkedBy({ idPrefix: "", urlBase: USER_URL }),
);

const channelOf = creatorFrom({ provider: "niconico", type: "channel" })(
  linkedBy({ idPrefix: "", urlBase: CHANNEL_URL }),
);

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

const nicoVideoOf = videoIn({ provider: "niconico", watchUrl: WATCH_URL });

export const videoSubjectOf = (entry: VideoEntry): SubjectInput =>
  nicoVideoOf({
    id: entry.video.id,
    title: entry.video.title,
    durationSec: Option.fromNullishOr(entry.video.duration),
    publishedAt: Option.fromNullishOr(entry.video.registeredAt),
    credits: ownerOf(entry),
  });

export const stampOf = (entry: VideoEntry): string | undefined =>
  pipe(
    [entry.lastViewedAt, entry.likedAt, entry.addedAt],
    Arr.map(Option.fromNullishOr),
    Option.firstSomeOf,
    Option.getOrUndefined,
  );

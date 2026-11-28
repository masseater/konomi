import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personIn, withoutRelations } from "#/features/ingest-history/api/providers/creator-input";
import { publishedOf, durationOf } from "#/features/ingest-history/api/providers/subject-fields";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { SoundcloudPlaylist, SoundcloudTrack, SoundcloudUser } from "./schemas.ts";

const TAG = /"(?<quoted>[^"]+)"|(?<bare>\S+)/gu;

const userOf = (user: SoundcloudUser): CreatorInput =>
  personIn("soundcloud")({
    externalId: String(user.id),
    title: user.username,
    url: user.permalink_url,
  });

const creditsOf = (user: SoundcloudUser | null | undefined): readonly CreatorInput[] =>
  pipe(Option.fromNullishOr(user), Option.map(userOf), Option.toArray);

const tagListOf = (tagList: string | null | undefined): readonly string[] =>
  pipe(
    Option.fromNullishOr(tagList),
    Option.map((text) => Arr.fromIterable(Str.matchAll(TAG)(text))),
    Option.map(
      Arr.map(({ groups }) =>
        pipe(
          Option.fromUndefinedOr(groups),
          Option.flatMap(({ quoted, bare }) =>
            Option.orElse(Option.fromUndefinedOr(quoted), () => Option.fromUndefinedOr(bare)),
          ),
        ),
      ),
    ),
    Option.map(Arr.getSomes),
    Option.getOrElse((): readonly string[] => []),
  );

const tagsOf = (
  item: Readonly<{ genre?: string | null | undefined; tag_list?: string | null | undefined }>,
): readonly string[] =>
  pipe(
    [...pipe(Option.fromNullishOr(item.genre), Option.toArray), ...tagListOf(item.tag_list)],
    Arr.map(Str.trim),
    Arr.filter(Str.isNonEmpty),
    Arr.dedupe,
  );

const soundcloud = subjectIn("soundcloud");

const durationMsOf = (track: SoundcloudTrack): Option.Option<number> =>
  Option.orElse(Option.fromNullishOr(track.full_duration), () =>
    Option.fromNullishOr(track.duration),
  );

const releasedOf = (track: SoundcloudTrack): Option.Option<string> =>
  Option.orElse(Option.fromNullishOr(track.display_date), () =>
    Option.fromNullishOr(track.created_at),
  );

const entityOf = (type: "track" | "playlist") => (item: SoundcloudTrack | SoundcloudPlaylist) =>
  ({
    externalId: String(item.id),
    type,
    title: item.title,
    url: item.permalink_url,
    credits: creditsOf(item.user),
    tags: tagsOf(item),
  }) as const;

export const trackOf = (track: SoundcloudTrack): SubjectInput =>
  soundcloud({
    ...entityOf("track")(track),
    ...durationOf(durationMsOf(track), "millis"),
    ...publishedOf(releasedOf(track)),
  });

export const playlistOf = (playlist: SoundcloudPlaylist): SubjectInput =>
  soundcloud(entityOf("playlist")(playlist));

export const followedUserOf = (user: SoundcloudUser): SubjectInput =>
  withoutRelations(userOf(user));

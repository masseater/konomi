import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personIn, withoutRelations } from "#/features/ingest-history/api/providers/creator-input";
import {
  durationFromMs,
  publishedOf,
} from "#/features/ingest-history/api/providers/subject-fields";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { SoundcloudPlaylist, SoundcloudTrack, SoundcloudUser } from "./schemas";

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

const durationOf = (track: SoundcloudTrack): Option.Option<number> =>
  Option.orElse(Option.fromNullishOr(track.full_duration), () =>
    Option.fromNullishOr(track.duration),
  );

const releasedOf = (track: SoundcloudTrack): Option.Option<string> =>
  Option.orElse(Option.fromNullishOr(track.display_date), () =>
    Option.fromNullishOr(track.created_at),
  );

export const trackOf = (track: SoundcloudTrack): SubjectInput =>
  soundcloud({
    externalId: String(track.id),
    type: "track",
    title: track.title,
    url: track.permalink_url,
    ...durationFromMs(durationOf(track)),
    ...publishedOf(releasedOf(track)),
    credits: creditsOf(track.user),
    tags: tagsOf(track),
  });

export const playlistOf = (playlist: SoundcloudPlaylist): SubjectInput =>
  soundcloud({
    externalId: String(playlist.id),
    type: "playlist",
    title: playlist.title,
    url: playlist.permalink_url,
    credits: creditsOf(playlist.user),
    tags: tagsOf(playlist),
  });

export const followedUserOf = (user: SoundcloudUser): SubjectInput =>
  withoutRelations(userOf(user));

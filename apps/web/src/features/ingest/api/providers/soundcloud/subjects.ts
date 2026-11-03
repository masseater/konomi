import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { withRelations } from "#/features/ingest/api/providers/observe";
import { durationFromMs, publishedOf } from "#/features/ingest/api/providers/subject-fields";

import type { SoundcloudPlaylist, SoundcloudTrack, SoundcloudUser } from "./schemas";

const TAG = /"(?<quoted>[^"]+)"|(?<bare>\S+)/gu;

const userOf = (user: SoundcloudUser): CreatorInput => ({
  provider: "soundcloud",
  externalId: String(user.id),
  type: "person",
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

const trackOf = (track: SoundcloudTrack): SubjectInput => ({
  provider: "soundcloud",
  externalId: String(track.id),
  type: "track",
  title: track.title,
  url: track.permalink_url,
  ...durationFromMs(
    Option.orElse(Option.fromNullishOr(track.full_duration), () =>
      Option.fromNullishOr(track.duration),
    ),
  ),
  ...publishedOf(
    Option.orElse(Option.fromNullishOr(track.display_date), () =>
      Option.fromNullishOr(track.created_at),
    ),
  ),
  credits: creditsOf(track.user),
  tags: tagsOf(track),
});

const playlistOf = (playlist: SoundcloudPlaylist): SubjectInput => ({
  provider: "soundcloud",
  externalId: String(playlist.id),
  type: "playlist",
  title: playlist.title,
  url: playlist.permalink_url,
  credits: creditsOf(playlist.user),
  tags: tagsOf(playlist),
});

const followedUserOf = (user: SoundcloudUser): SubjectInput =>
  withRelations({ credits: [], tags: [] })(userOf(user));

export { followedUserOf, playlistOf, trackOf };

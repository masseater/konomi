import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorFrom, withRelations } from "#/features/ingest-history/api/providers/creator-input";
import { textOr } from "#/features/ingest-history/api/providers/non-blank";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api.ts";
import type { BlueskyPost, BlueskyProfile } from "./schemas.ts";

const PATH_SEPARATOR = "/";

const personOf: (profile: BlueskyProfile) => CreatorInput = creatorFrom({ provider: "bluesky" })({
  externalId: ({ did }) => did,
  title: ({ handle, displayName }) => textOr(handle)(displayName),
  url: ({ handle }) => `${WEB}/profile/${handle}`,
});

export const followedOf = (profile: BlueskyProfile): SubjectInput =>
  withRelations({ credits: [], tags: [] })(personOf(profile));

const postUrlOf = (post: BlueskyPost): string =>
  pipe(
    Str.split(post.uri, PATH_SEPARATOR),
    Arr.last,
    Option.map((rkey) => `${WEB}/profile/${post.author.handle}/post/${rkey}`),
    Option.getOrElse(() => `${WEB}/profile/${post.author.handle}`),
  );

export const postOf = (post: BlueskyPost): SubjectInput =>
  subjectIn("bluesky")({
    externalId: post.uri,
    type: "post",
    text: Option.fromNullishOr(post.record.text),
    url: postUrlOf(post),
    publishedAt: post.record.createdAt,
    credits: [personOf(post.author)],
  });

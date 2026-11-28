import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personIn, withRelations } from "#/features/ingest-history/api/providers/creator-input";
import { nonEmptyOr } from "#/features/ingest-history/api/providers/observe";
import { textSubjectIn } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api";
import type { BlueskyPost, BlueskyProfile } from "./schemas";

const PATH_SEPARATOR = "/";

const personOf = (profile: BlueskyProfile): CreatorInput =>
  personIn("bluesky")({
    externalId: profile.did,
    title: nonEmptyOr(profile.handle)(profile.displayName),
    url: `${WEB}/profile/${profile.handle}`,
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
  textSubjectIn("bluesky")({
    externalId: post.uri,
    type: "post",
    text: Option.fromNullishOr(post.record.text),
    url: postUrlOf(post),
    publishedAt: post.record.createdAt,
    credits: [personOf(post.author)],
  });

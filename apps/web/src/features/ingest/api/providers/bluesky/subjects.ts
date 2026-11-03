import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { withRelations } from "#/features/ingest/api/providers/observe";
import { postTitleOf } from "#/features/ingest/api/providers/post-title";
import { publishedOf } from "#/features/ingest/api/providers/subject-fields";

import { WEB } from "./api";
import type { BlueskyPost, BlueskyProfile } from "./schemas";

const PATH_SEPARATOR = "/";

const personOf = (profile: BlueskyProfile): CreatorInput => ({
  provider: "bluesky",
  externalId: profile.did,
  type: "person",
  title: pipe(
    Option.fromNullishOr(profile.displayName),
    Option.filter(Str.isNonEmpty),
    Option.getOrElse(() => profile.handle),
  ),
  url: `${WEB}/profile/${profile.handle}`,
});

const followedOf = (profile: BlueskyProfile): SubjectInput =>
  withRelations({ credits: [], tags: [] })(personOf(profile));

const postUrlOf = (post: BlueskyPost): string =>
  pipe(
    Str.split(post.uri, PATH_SEPARATOR),
    Arr.last,
    Option.map((rkey) => `${WEB}/profile/${post.author.handle}/post/${rkey}`),
    Option.getOrElse(() => `${WEB}/profile/${post.author.handle}`),
  );

const postOf = (post: BlueskyPost): SubjectInput => ({
  provider: "bluesky",
  externalId: post.uri,
  type: "post",
  title: postTitleOf({ text: Option.fromNullishOr(post.record.text), fallback: postUrlOf(post) }),
  url: postUrlOf(post),
  ...publishedOf(Option.fromNullishOr(post.record.createdAt)),
  credits: [personOf(post.author)],
  tags: [],
});

export { followedOf, postOf };

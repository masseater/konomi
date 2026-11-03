import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { withRelations } from "#/features/ingest/api/providers/observe";
import { plainTextOf, postTitleOf } from "#/features/ingest/api/providers/post-title";
import { publishedOf } from "#/features/ingest/api/providers/subject-fields";

import type { MastodonAccount, MastodonStatus, MastodonTag } from "./schemas";

const accountOf = (account: MastodonAccount): CreatorInput => ({
  provider: "mastodon",
  externalId: account.url,
  type: "person",
  title: pipe(
    Option.fromNullishOr(account.display_name),
    Option.filter(Str.isNonEmpty),
    Option.getOrElse(() => account.acct),
  ),
  url: account.url,
});

const followedOf = (account: MastodonAccount): SubjectInput =>
  withRelations({ credits: [], tags: [] })(accountOf(account));

const statusOf = (status: MastodonStatus): SubjectInput => {
  const url = pipe(
    Option.fromNullishOr(status.url),
    Option.getOrElse(() => status.uri),
  );
  return {
    provider: "mastodon",
    externalId: status.uri,
    type: "post",
    title: postTitleOf({
      text: pipe(Option.fromNullishOr(status.content), Option.map(plainTextOf)),
      fallback: url,
    }),
    url,
    ...publishedOf(Option.fromNullishOr(status.created_at)),
    credits: [accountOf(status.account)],
    tags: pipe(
      Option.fromNullishOr(status.tags),
      Option.getOrElse((): readonly MastodonTag[] => []),
      Arr.map(({ name }) => name),
    ),
  };
};

export { followedOf, statusOf };

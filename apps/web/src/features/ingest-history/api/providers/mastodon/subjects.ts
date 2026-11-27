import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import {
  withRelations,
  personInputOf,
  nonEmptyOr,
} from "#/features/ingest-history/api/providers/observe";
import { plainTextOf, postTitleOf } from "#/features/ingest-history/api/providers/post-title";
import { publishedOf } from "#/features/ingest-history/api/providers/subject-fields";

import type { MastodonAccount, MastodonStatus, MastodonTag } from "./schemas";

const accountOf = (account: MastodonAccount): CreatorInput =>
  personInputOf({
    provider: "mastodon",
    externalId: account.url,
    title: nonEmptyOr(account.acct)(account.display_name),
    url: account.url,
  });

export const followedOf = (account: MastodonAccount): SubjectInput =>
  withRelations({ credits: [], tags: [] })(accountOf(account));

export const statusOf = (status: MastodonStatus): SubjectInput => {
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

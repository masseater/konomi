import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personIn, withoutRelations } from "#/features/ingest-history/api/providers/creator-input";
import { nonEmptyOr } from "#/features/ingest-history/api/providers/observe";
import { plainTextOf } from "#/features/ingest-history/api/providers/post-title";
import { orEmpty, textSubjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { MastodonAccount, MastodonStatus } from "./schemas";

const accountOf = (account: MastodonAccount): CreatorInput =>
  personIn("mastodon")({
    externalId: account.url,
    title: nonEmptyOr(account.acct)(account.display_name),
    url: account.url,
  });

export const followedOf = (account: MastodonAccount): SubjectInput =>
  withoutRelations(accountOf(account));

export const statusOf = (status: MastodonStatus): SubjectInput => {
  const url = pipe(
    Option.fromNullishOr(status.url),
    Option.getOrElse(() => status.uri),
  );
  return textSubjectIn("mastodon")({
    externalId: status.uri,
    type: "post",
    text: pipe(Option.fromNullishOr(status.content), Option.map(plainTextOf)),
    url,
    publishedAt: status.created_at,
    credits: [accountOf(status.account)],
    tags: pipe(
      orEmpty(status.tags),
      Arr.map(({ name }) => name),
    ),
  });
};

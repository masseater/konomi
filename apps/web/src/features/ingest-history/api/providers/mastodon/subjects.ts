import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, ListingKind, SubjectInput } from "#/entities/signal";
import { creatorIn } from "#/features/ingest-history/api/providers/creator-input";
import { textOr } from "#/features/ingest-history/api/providers/non-blank";
import {
  datedObservationsOf,
  followedCreatorsAt,
} from "#/features/ingest-history/api/providers/observe";
import type { Observer } from "#/features/ingest-history/api/providers/observe";
import { plainTextOf } from "#/features/ingest-history/api/providers/post-title";
import { orEmpty, subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { MastodonAccount, MastodonStatus } from "./schemas.ts";

const accountOf = (account: MastodonAccount): CreatorInput =>
  creatorIn("mastodon")({
    externalId: account.url,
    title: textOr(account.acct)(account.display_name),
    url: account.url,
  });

export const followObservationsOf = followedCreatorsAt(accountOf);

const statusOf = (status: MastodonStatus): SubjectInput => {
  const url = pipe(
    Option.fromNullishOr(status.url),
    Option.getOrElse(() => status.uri),
  );
  return subjectIn("mastodon")({
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

export const statusObservationsOf = (kind: ListingKind): Observer<MastodonStatus> =>
  datedObservationsOf({ kind, subjectOf: (status) => Option.some(statusOf(status)) });

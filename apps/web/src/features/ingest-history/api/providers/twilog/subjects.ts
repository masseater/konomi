import { Option } from "effect";

import type { CreatorInput, ListingKind, Observation, SubjectInput } from "#/entities/signal";
import { personInputOf } from "#/features/ingest-history/api/providers/creator-input";
import {
  epochOr,
  nonEmptyOr,
  observationsOf,
} from "#/features/ingest-history/api/providers/observe";
import { postTitleOf } from "#/features/ingest-history/api/providers/post-title";
import { publishedOf } from "#/features/ingest-history/api/providers/subject-fields";

import type { TwilogLog } from "./schemas";

const X_ORIGIN = "https://x.com";

const authorOf = (log: TwilogLog): CreatorInput =>
  personInputOf({
    provider: "twilog",
    externalId: `@${log.authorId}`,
    title: nonEmptyOr(log.authorId)(log.authorName),
    url: `${X_ORIGIN}/${log.authorId}`,
  });

const postOf = (log: TwilogLog): SubjectInput => ({
  provider: "twilog",
  externalId: log.contentUrl,
  type: "post",
  title: postTitleOf({ text: Option.fromNullishOr(log.content), fallback: log.contentUrl }),
  url: log.contentUrl,
  ...publishedOf(Option.some(log.createdAt)),
  credits: [authorOf(log)],
  tags: [],
});

export const logObservationsOf =
  ({ kind, fetchedAt }: Readonly<{ kind: ListingKind; fetchedAt: number }>) =>
  (logs: readonly TwilogLog[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return observationsOf(kind)({ subjectOf: postOf, occurredAtOf: (log) => at(log.createdAt) })(
      logs,
    );
  };

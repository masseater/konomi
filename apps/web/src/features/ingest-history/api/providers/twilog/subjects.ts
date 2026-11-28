import { Option } from "effect";

import type { CreatorInput, ListingKind, Observation, SubjectInput } from "#/entities/signal";
import { personIn } from "#/features/ingest-history/api/providers/creator-input";
import {
  epochOr,
  nonEmptyOr,
  observationsOf,
} from "#/features/ingest-history/api/providers/observe";
import { textSubjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { TwilogLog } from "./schemas.ts";

const X_ORIGIN = "https://x.com";

const authorOf = (log: TwilogLog): CreatorInput =>
  personIn("twilog")({
    externalId: `@${log.authorId}`,
    title: nonEmptyOr(log.authorId)(log.authorName),
    url: `${X_ORIGIN}/${log.authorId}`,
  });

const postOf = (log: TwilogLog): SubjectInput =>
  textSubjectIn("twilog")({
    externalId: log.contentUrl,
    type: "post",
    text: Option.fromNullishOr(log.content),
    url: log.contentUrl,
    publishedAt: log.createdAt,
    credits: [authorOf(log)],
  });

export const logObservationsOf =
  ({ kind, fetchedAt }: Readonly<{ kind: ListingKind; fetchedAt: number }>) =>
  (logs: readonly TwilogLog[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return observationsOf(kind)({ subjectOf: postOf, occurredAtOf: (log) => at(log.createdAt) })(
      logs,
    );
  };

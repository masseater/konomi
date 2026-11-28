import { Option } from "effect";

import type { CreatorInput, ListingKind, SubjectInput } from "#/entities/signal";
import { creatorFrom } from "#/features/ingest-history/api/providers/creator-input";
import { textOr } from "#/features/ingest-history/api/providers/non-blank";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Observer } from "#/features/ingest-history/api/providers/observe";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { TwilogLog } from "./schemas.ts";

const X_ORIGIN = "https://x.com";

const authorOf: (log: TwilogLog) => CreatorInput = creatorFrom({ provider: "twilog" })({
  externalId: ({ authorId }) => `@${authorId}`,
  title: ({ authorId, authorName }) => textOr(authorId)(authorName),
  url: ({ authorId }) => `${X_ORIGIN}/${authorId}`,
});

const postOf = (log: TwilogLog): SubjectInput =>
  subjectIn("twilog")({
    externalId: log.contentUrl,
    type: "post",
    text: Option.fromNullishOr(log.content),
    url: log.contentUrl,
    publishedAt: log.createdAt,
    credits: [authorOf(log)],
  });

export const logObservationsOf = (kind: ListingKind): Observer<TwilogLog> =>
  datedObservationsOf({
    kind,
    subjectOf: (log) => Option.some(postOf(log)),
    occurredAtOf: ({ createdAt }) => createdAt,
  });

import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";
import { postTitleOf } from "#/features/ingest/api/providers/post-title";
import { publishedOf } from "#/features/ingest/api/providers/subject-fields";

import type { TwilogLog } from "./schemas";

const X_ORIGIN = "https://x.com";

const authorOf = (log: TwilogLog): CreatorInput => ({
  provider: "twilog",
  externalId: `@${log.authorId}`,
  type: "person",
  title: pipe(
    Option.fromNullishOr(log.authorName),
    Option.filter(Str.isNonEmpty),
    Option.getOrElse(() => log.authorId),
  ),
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

const logObservationsOf =
  ({ kind, fetchedAt }: Readonly<{ kind: "endorsed" | "collected"; fetchedAt: number }>) =>
  (logs: readonly TwilogLog[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      logs,
      Arr.map((log): Observation => ({
        kind,
        subject: postOf(log),
        occurredAtMs: at(log.createdAt),
      })),
    );
  };

export { logObservationsOf };

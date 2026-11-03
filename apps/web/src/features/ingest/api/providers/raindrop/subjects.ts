import { Array as Arr, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";
import { postTitleOf } from "#/features/ingest/api/providers/post-title";

import type { RaindropItem } from "./schemas";

const pageOf = ({ _id: id, ...item }: RaindropItem): SubjectInput => ({
  provider: "raindrop",
  externalId: String(id),
  type: "page",
  title: postTitleOf({ text: Option.fromNullishOr(item.title), fallback: item.link }),
  url: item.link,
  credits: [],
  tags: [
    ...pipe(
      Option.fromNullishOr(item.tags),
      Option.getOrElse((): readonly string[] => []),
    ),
    ...Option.toArray(Option.fromNullishOr(item.domain)),
  ],
});

const raindropObservationsOf =
  (fetchedAt: number) =>
  (items: readonly RaindropItem[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      items,
      Arr.map((item): Observation => ({
        kind: "collected",
        subject: pageOf(item),
        occurredAtMs: at(item.created),
      })),
    );
  };

export { raindropObservationsOf };

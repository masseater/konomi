import { Option, pipe } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { stampedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { postTitleOf } from "#/features/ingest-history/api/providers/post-title";

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

export const raindropObservationsOf = stampedObservationsOf("collected")<RaindropItem>({
  subjectOf: pageOf,
  dateOf: ({ created }) => created,
});

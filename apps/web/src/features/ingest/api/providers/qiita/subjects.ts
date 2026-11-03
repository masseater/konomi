import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { publishedOf } from "#/features/ingest/api/providers/subject-fields";

import type { QiitaItem } from "./schemas";

const WEB = "https://qiita.com";

const authorOf = (author: QiitaItem["user"]): CreatorInput => ({
  provider: "qiita",
  externalId: `user:${author.id}`,
  type: "person",
  title: pipe(
    Option.fromNullishOr(author.name),
    Option.filter(Str.isNonEmpty),
    Option.getOrElse(() => author.id),
  ),
  url: `${WEB}/${author.id}`,
});

const articleOf = (item: QiitaItem): SubjectInput => ({
  provider: "qiita",
  externalId: item.id,
  type: "post",
  title: item.title,
  url: item.url,
  ...publishedOf(Option.some(item.created_at)),
  credits: [authorOf(item.user)],
  tags: pipe(
    item.tags,
    Arr.map(({ name }) => name),
  ),
});

const stockObservationsOf =
  (fetchedAt: number) =>
  (items: readonly QiitaItem[]): readonly Observation[] =>
    pipe(
      items,
      Arr.map((item): Observation => ({
        kind: "collected",
        subject: articleOf(item),
        occurredAtMs: fetchedAt,
      })),
    );

export { stockObservationsOf };

import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { nonEmptyOr, observationsOf } from "#/features/ingest-history/api/providers/observe";
import { publishedOf } from "#/features/ingest-history/api/providers/subject-fields";

import type { QiitaItem } from "./schemas";

const WEB = "https://qiita.com";

const authorOf = (author: QiitaItem["user"]): CreatorInput => ({
  provider: "qiita",
  externalId: `user:${author.id}`,
  type: "person",
  title: nonEmptyOr(author.id)(author.name),
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

export const stockObservationsOf =
  (fetchedAt: number) =>
  (items: readonly QiitaItem[]): readonly Observation[] =>
    observationsOf("collected")({ subjectOf: articleOf, occurredAtOf: () => fetchedAt })(items);

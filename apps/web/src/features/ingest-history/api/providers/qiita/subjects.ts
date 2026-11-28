import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personMapper } from "#/features/ingest-history/api/providers/creator-input";
import { fetchedObservationsOf, nonEmptyOr } from "#/features/ingest-history/api/providers/observe";
import { publishedOf } from "#/features/ingest-history/api/providers/subject-fields";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { QiitaItem } from "./schemas.ts";

const WEB = "https://qiita.com";

const personOf = personMapper({ provider: "qiita", idPrefix: "user:", urlBase: `${WEB}/` });

const authorOf = (author: QiitaItem["user"]): CreatorInput =>
  personOf({ id: author.id, name: nonEmptyOr(author.id)(author.name) });

const articleOf = (item: QiitaItem): SubjectInput =>
  subjectIn("qiita")({
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

export const stockObservationsOf = fetchedObservationsOf("collected")(articleOf);

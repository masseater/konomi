import { Option } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { stampedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { orEmpty, textSubjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { RaindropItem } from "./schemas";

const pageOf = ({ _id: id, ...item }: RaindropItem): SubjectInput =>
  textSubjectIn("raindrop")({
    externalId: String(id),
    type: "page",
    text: Option.fromNullishOr(item.title),
    url: item.link,
    tags: [...orEmpty(item.tags), ...Option.toArray(Option.fromNullishOr(item.domain))],
  });

export const raindropObservationsOf = stampedObservationsOf("collected")<RaindropItem>({
  subjectOf: pageOf,
  dateOf: ({ created }) => created,
});

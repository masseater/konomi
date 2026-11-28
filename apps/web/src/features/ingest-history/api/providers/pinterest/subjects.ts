import { Array as Arr, Option, pipe } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { stampedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { textSubjectIn } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api";
import type { PinterestPin } from "./schemas";

const pinOf = (pin: PinterestPin): SubjectInput => {
  const url = `${WEB}/pin/${pin.id}`;
  const text = pipe(
    [pin.title, pin.description],
    Arr.map(Option.fromNullishOr),
    Arr.getSomes,
    Arr.head,
  );
  return textSubjectIn("pinterest")({
    externalId: pin.id,
    type: "artwork",
    text,
    url,
    tags: pipe(
      Option.fromNullishOr(pin.link),
      Option.flatMap((link) => Option.liftThrowable(() => new URL(link).hostname)()),
      Option.toArray,
    ),
  });
};

export const pinObservationsOf = stampedObservationsOf("collected")<PinterestPin>({
  subjectOf: pinOf,
  dateOf: ({ created_at: createdAt }) => createdAt,
});

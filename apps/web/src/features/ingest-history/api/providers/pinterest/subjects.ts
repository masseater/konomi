import { Array as Arr, Option, pipe, Function as Fn } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { textSubjectIn } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api.ts";
import type { PinterestPin } from "./schemas.ts";

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

export const pinObservationsOf = datedObservationsOf({
  kind: "collected",
  subjectOf: Fn.flow(pinOf, Option.some),
  occurredAtOf: ({ created_at: createdAt }: PinterestPin) => createdAt,
});

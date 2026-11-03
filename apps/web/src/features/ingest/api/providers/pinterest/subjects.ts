import { Array as Arr, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";
import { postTitleOf } from "#/features/ingest/api/providers/post-title";

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
  return {
    provider: "pinterest",
    externalId: pin.id,
    type: "artwork",
    title: postTitleOf({ text, fallback: url }),
    url,
    credits: [],
    tags: pipe(
      Option.fromNullishOr(pin.link),
      Option.flatMap((link) => Option.liftThrowable(() => new URL(link).hostname)()),
      Option.toArray,
    ),
  };
};

const pinObservationsOf =
  (fetchedAt: number) =>
  (pins: readonly PinterestPin[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      pins,
      Arr.map((pin): Observation => ({
        kind: "collected",
        subject: pinOf(pin),
        occurredAtMs: at(pin.created_at),
      })),
    );
  };

export { pinObservationsOf };

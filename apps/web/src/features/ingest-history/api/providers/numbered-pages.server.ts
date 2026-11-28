import { Option, pipe } from "effect";
import type { Schema } from "effect";

import { sourceOf } from "#/features/ingest-history/api/providers/listing.server";
import type { BodyFetch, Sourcing } from "#/features/ingest-history/api/providers/listing.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { urlAdvancing, urlWith } from "#/features/ingest-history/api/providers/url-with";

const NEXT = 1;

export type Numbering = Readonly<{ param: string; limit: number; start: number; step?: number }>;

const numberedPageOf =
  ({ param, limit, step }: Numbering) =>
  <Item>(items: readonly Item[], url: string): Page<Item> => ({
    items,
    next: pipe(
      Option.liftPredicate(items.length, (count: number) => count >= limit),
      Option.map(() =>
        urlAdvancing(url, {
          param,
          step: pipe(
            Option.fromUndefinedOr(step),
            Option.getOrElse(() => NEXT),
          ),
        }),
      ),
    ),
  });

export const numberedSource = <Body, Item>({
  base,
  numbering,
  schema,
  fetch,
  itemsOf,
}: Readonly<{
  base: string;
  numbering: Numbering;
  schema: Schema.Decoder<Body>;
  fetch?: BodyFetch<Body> | undefined;
  itemsOf: (body: Body) => readonly Item[];
}>): Sourcing<Item> => {
  const pageOf = numberedPageOf(numbering);
  return sourceOf({
    first: urlWith(base, { [numbering.param]: String(numbering.start) }),
    schema,
    fetch,
  })((body, url) => pageOf(itemsOf(body), url));
};

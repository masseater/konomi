import { Option, pipe } from "effect";
import type { Schema } from "effect";

import { jsonSource } from "#/features/ingest-history/api/providers/listing.server";
import type { Sourcing } from "#/features/ingest-history/api/providers/listing.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { urlAdvancing, urlWith } from "#/features/ingest-history/api/providers/url-with";

const NEXT = 1;

export type Numbering = Readonly<{ param: string; limit: number; start: number; step?: number }>;

const numberedPageOf =
  ({ url, param, limit, step }: Numbering & Readonly<{ url: string }>) =>
  <Item>(items: readonly Item[]): Page<Item> => ({
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

export const numberedPaging = <Body, Item>({
  base,
  numbering,
  itemsOf,
}: Readonly<{
  base: string;
  numbering: Numbering;
  itemsOf: (body: Body) => readonly Item[];
}>): Readonly<{ first: string; pageOf: (body: Body, url: string) => Page<Item> }> => ({
  first: urlWith(base, { [numbering.param]: String(numbering.start) }),
  pageOf: (body, url) => numberedPageOf({ url, ...numbering })(itemsOf(body)),
});

export const numberedSource = <Body, Item>({
  schema,
  ...paging
}: Readonly<{
  base: string;
  numbering: Numbering;
  schema: Schema.Decoder<Body>;
  itemsOf: (body: Body) => readonly Item[];
}>): Sourcing<Item> => jsonSource({ schema, ...numberedPaging(paging) });

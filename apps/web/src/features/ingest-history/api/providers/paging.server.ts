import { Effect, Match, Option } from "effect";
import type { Schema } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

export type Page<Item> = Readonly<{ items: readonly Item[]; next: Option.Option<string> }>;

const FIRST_PAGE = 1;
const BACKFILL_PAGES = 20;

export const pagesUpTo =
  (backfill: number) =>
  (backfilled: boolean): number =>
    Match.value(backfilled).pipe(
      Match.when(true, () => FIRST_PAGE),
      Match.orElse(() => backfill),
    );

export const pagesFor = pagesUpTo(BACKFILL_PAGES);

export const collectPages = <Item, Env = never>({
  first,
  pages,
  fetchPage,
}: Readonly<{
  first: string;
  pages: number;
  fetchPage: (url: string) => Effect.Effect<Page<Item>, ProviderError, Env>;
}>): Effect.Effect<readonly Item[], ProviderError, Env> =>
  Effect.gen(function* collect() {
    const collected: Item[] = [];
    let next = Option.some(first);
    for (let fetched = 0; fetched < pages && Option.isSome(next); fetched += FIRST_PAGE) {
      const page = yield* fetchPage(next.value);
      collected.push(...page.items);
      ({ next } = page);
    }
    return collected;
  });

export const collectJsonPages = <Item, Body extends Schema.Top>({
  first,
  headers,
  pages,
  schema,
  pageOf,
}: Readonly<{
  first: string;
  headers: Headers;
  pages: number;
  schema: Body;
  pageOf: (body: Body["Type"], url: string) => Page<Item>;
}>): Effect.Effect<readonly Item[], ProviderError, Body["DecodingServices"]> =>
  collectPages({
    first,
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers, schema }).pipe(Effect.map((body) => pageOf(body, url))),
  });

import { Effect, Match, Option, pipe } from "effect";

import { urlAdvancing, urlWith } from "#/features/ingest-history/api/providers/url-with";
import type { ProviderError } from "#/features/ingest-history/model/provider";

export type Page<Item> = Readonly<{ items: readonly Item[]; next: Option.Option<string> }>;

const FIRST_PAGE = 1;
export const BACKFILL_PAGES = 20;

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

export type Numbering = Readonly<{
  param: string;
  limit: number;
  start: number;
  step?: number | undefined;
}>;

export type Next<Body> =
  | Readonly<{ number: Numbering }>
  | Readonly<{ cursor: string; cursorOf: (body: Body) => Option.Option<string> }>
  | Readonly<{ follow: (body: Body, cursor: string) => Option.Option<string> }>;

export const startUrlOf = <Body>({
  first,
  next,
}: Readonly<{ first: string; next: Option.Option<Next<Body>> }>): string => {
  if (Option.isSome(next) && "number" in next.value) {
    const { param, start } = next.value.number;
    return urlWith(first, { [param]: String(start) });
  }
  return first;
};

export const nextUrlOf = <Body>({
  next,
  body,
  count,
  cursor,
}: Readonly<{
  next: Option.Option<Next<Body>>;
  body: Body;
  count: number;
  cursor: string;
}>): Option.Option<string> =>
  pipe(
    next,
    Option.flatMap((found) => {
      if ("number" in found) {
        const { param, limit, step = FIRST_PAGE } = found.number;
        return pipe(
          Option.liftPredicate(count, (taken: number) => taken >= limit),
          Option.map(() => urlAdvancing(cursor, { param, step })),
        );
      }
      if ("cursor" in found) {
        return pipe(
          found.cursorOf(body),
          Option.map((value) => urlWith(cursor, { [found.cursor]: value })),
        );
      }
      return found.follow(body, cursor);
    }),
  );

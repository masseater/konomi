import { Effect, Match, Option } from "effect";

import type { ProviderError } from "#/features/ingest/model/provider";

type Page<Item> = Readonly<{ items: readonly Item[]; next: Option.Option<string> }>;

const FIRST_PAGE = 1;
const BACKFILL_PAGES = 20;

const pagesUpTo =
  (backfill: number) =>
  (backfilled: boolean): number =>
    Match.value(backfilled).pipe(
      Match.when(true, () => FIRST_PAGE),
      Match.orElse(() => backfill),
    );

const pagesFor = pagesUpTo(BACKFILL_PAGES);

const collectPages = <Item>({
  first,
  pages,
  fetchPage,
}: Readonly<{
  first: string;
  pages: number;
  fetchPage: (url: string) => Effect.Effect<Page<Item>, ProviderError>;
}>): Effect.Effect<readonly Item[], ProviderError> =>
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

export type { Page };
export { collectPages, pagesFor, pagesUpTo };

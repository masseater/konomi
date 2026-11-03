import { parseNextUrl } from "@book000/pixivts";
import type { ParsedNextUrl, PixivError, Result } from "@book000/pixivts";
import { Effect, Match, Option, String as Str } from "effect";

import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

import { FIRST_PAGE } from "./api";

type Paged = Readonly<{ nextUrl: string | null }>;

type Listing<Body extends Paged, Item> = Readonly<{
  name: string;
  list: (cursor: Readonly<ParsedNextUrl>) => PromiseLike<Result<Body, PixivError>>;
  itemsOf: (body: Body) => readonly Item[];
}>;

const failureOf = (error: Readonly<PixivError>): ProviderError =>
  Match.value(error).pipe(
    Match.when({ type: "auth_failed" }, () =>
      CredentialRejected.make({ message: "pixiv のログインが切れた。refresh token を取り直す" }),
    ),
    Match.orElse(({ type }) =>
      ProviderUnavailable.make({ message: `pixiv を読めなかった (${type})` }),
    ),
  );

const cursorOf = (url: string): ParsedNextUrl =>
  Match.value(Str.isEmpty(url)).pipe(
    Match.when(true, (): ParsedNextUrl => ({})),
    Match.orElse(() => parseNextUrl(url)),
  );

const fetchPageOf =
  <Body extends Paged, Item>({ name, list, itemsOf }: Listing<Body, Item>) =>
  (url: string): Effect.Effect<Page<Item>, ProviderError> =>
    Effect.tryPromise({
      try: () => list(cursorOf(url)),
      catch: (cause) =>
        ProviderUnavailable.make({ message: `pixiv の ${name} を読めなかった: ${String(cause)}` }),
    }).pipe(
      Effect.flatMap((result) =>
        result.match(
          (body): Effect.Effect<Page<Item>, ProviderError> =>
            Effect.succeed({ items: itemsOf(body), next: Option.fromNullishOr(body.nextUrl) }),
          (failure): Effect.Effect<Page<Item>, ProviderError> => Effect.fail(failureOf(failure)),
        ),
      ),
      Effect.withSpan("pixiv.list", { attributes: { name } }),
    );

const collectListing =
  (pages: number) =>
  <Body extends Paged, Item>(
    listing: Listing<Body, Item>,
  ): Effect.Effect<readonly Item[], ProviderError> =>
    collectPages({ first: FIRST_PAGE, pages, fetchPage: fetchPageOf(listing) });

export type { Listing, Paged };
export { collectListing };

import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { bearerHeadersOf } from "#/features/ingest/api/providers/oauth.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, LIMIT, USER_AGENT } from "./api";
import { Listing, Me } from "./schemas";
import type { RedditThing } from "./schemas";
import { thingOf } from "./subjects";

type Reading = Readonly<{ headers: Headers; user: string; pages: number; fetchedAt: number }>;

type ListingKind = "endorsed" | "collected";

const listingOf =
  ({ headers, user, pages, fetchedAt }: Reading) =>
  (path: string, kind: ListingKind): Effect.Effect<readonly Observation[], ProviderError> => {
    const first = `${API}/user/${user}/${path}?limit=${LIMIT}&raw_json=1`;
    const observe = (thing: RedditThing): Observation => ({
      kind,
      subject: thingOf(thing),
      occurredAtMs: fetchedAt,
    });
    return collectPages({
      first,
      pages,
      fetchPage: (url) =>
        fetchJson({ url, headers, schema: Listing }).pipe(
          Effect.map(({ data }) => ({
            items: data.children,
            next: pipe(
              Option.fromNullishOr(data.after),
              Option.map((after) => `${first}&after=${after}`),
            ),
          })),
        ),
    }).pipe(Effect.map(Arr.map(observe)));
  };

const pullReddit = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* reddit() {
    const headers = { ...(yield* bearerHeadersOf(credential)), "User-Agent": USER_AGENT };
    const { name } = yield* fetchJson({ url: `${API}/api/v1/me`, headers, schema: Me });
    const listing = listingOf({
      headers,
      user: encodeURIComponent(name),
      pages: pagesOf(cursor),
      fetchedAt: yield* Clock.currentTimeMillis,
    });
    return {
      observations: [
        ...(yield* listing("upvoted", "endorsed")),
        ...(yield* listing("saved", "collected")),
      ],
      cursor: yield* BACKFILLED,
    };
  }).pipe(Effect.withSpan("reddit.pull"));

export { pullReddit };

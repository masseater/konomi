import { Array as Arr, Clock, Effect } from "effect";

import type { Observation } from "#/entities/signal";
import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { collectNumberedPages } from "#/features/ingest/api/providers/numbered-pages.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, FIELD, HEADERS, LIMIT } from "./api";
import { Friends, Works } from "./schemas";
import type { VrchatFriend, VrchatWork } from "./schemas";
import { favoriteObservationsOf, friendObservationsOf } from "./subjects";

const NUMBERING = { param: "offset", limit: LIMIT, start: 0, step: LIMIT } as const;

type Listing = Readonly<{ headers: Headers; pages: number }>;

const worksAt =
  ({ headers, pages }: Listing) =>
  (path: string): Effect.Effect<readonly VrchatWork[], ProviderError> =>
    collectNumberedPages({
      base: `${API}${path}?n=${LIMIT}`,
      numbering: NUMBERING,
      headers,
      pages,
      schema: Works,
      itemsOf: (works) => works,
    }).pipe(Effect.withSpan("vrchat.favorites", { attributes: { path } }));

const friendsOf =
  ({ headers, pages }: Listing) =>
  (offline: boolean): Effect.Effect<readonly VrchatFriend[], ProviderError> =>
    collectNumberedPages({
      base: `${API}/auth/user/friends?n=${LIMIT}&offline=${String(offline)}`,
      numbering: NUMBERING,
      headers,
      pages,
      schema: Friends,
      itemsOf: (friends) => friends,
    }).pipe(Effect.withSpan("vrchat.friends", { attributes: { offline } }));

const observationsOf = (
  listing: Listing,
  fetchedAt: number,
): Effect.Effect<readonly Observation[], ProviderError> => {
  const works = worksAt(listing);
  const friends = friendsOf(listing);
  const worldsSeen = favoriteObservationsOf({ kind: "world", fetchedAt });
  const avatarsSeen = favoriteObservationsOf({ kind: "avatar", fetchedAt });
  const friendsSeen = friendObservationsOf(fetchedAt);
  return Effect.all([
    works("/worlds/favorites").pipe(Effect.map(worldsSeen)),
    works("/avatars/favorites").pipe(Effect.map(avatarsSeen)),
    friends(false).pipe(Effect.map(friendsSeen)),
    friends(true).pipe(Effect.map(friendsSeen)),
  ]).pipe(Effect.map(Arr.flatten));
};

const pullVrchat = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* vrchat() {
    const auth = yield* requireField(credential, FIELD.auth);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const listing = { headers: { ...HEADERS, Cookie: `auth=${auth}` }, pages: pagesOf(cursor) };
    const observations = yield* observationsOf(listing, fetchedAt);
    return { observations, cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("vrchat.pull"));

export { pullVrchat };

import { Array as Arr, Effect, pipe } from "effect";

import type { ListingKind, Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest-history/api/providers/instance-origin";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { FIELD, LIMIT } from "./api";
import { Accounts, Statuses, Verified } from "./schemas";
import type { MastodonStatus } from "./schemas";
import { followedOf, statusOf } from "./subjects";

type Reading = Readonly<{ origin: string; headers: Headers; fetchedAt: number }>;

const statusesAt =
  ({ origin, headers, fetchedAt }: Reading) =>
  (path: string, kind: ListingKind): Effect.Effect<readonly Observation[], ProviderError> => {
    const observe = (status: MastodonStatus): Observation => ({
      kind,
      subject: statusOf(status),
      occurredAtMs: fetchedAt,
    });
    return fetchJson({
      url: `${origin}/api/v1/${path}?limit=${LIMIT}`,
      headers,
      schema: Statuses,
    }).pipe(Effect.map(Arr.map(observe)));
  };

const followingOf = ({
  origin,
  headers,
  fetchedAt,
}: Reading): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* following() {
    const { id } = yield* fetchJson({
      url: `${origin}/api/v1/accounts/verify_credentials`,
      headers,
      schema: Verified,
    });
    const accounts = yield* fetchJson({
      url: `${origin}/api/v1/accounts/${id}/following?limit=${LIMIT}`,
      headers,
      schema: Accounts,
    });
    return pipe(
      accounts,
      Arr.map((account): Observation => ({
        kind: "followed",
        subject: followedOf(account),
        occurredAtMs: fetchedAt,
      })),
    );
  });

export const pullMastodon = pullOf({
  provider: "mastodon",
  cursor: "kept",
  observe: ({ credential, fetchedAt }) =>
    Effect.gen(function* mastodon() {
      const reading: Reading = {
        origin: yield* instanceOriginOf(FIELD.instance)(credential),
        headers: yield* requireField(credential, FIELD.accessToken).pipe(
          Effect.map((token) => ({ Authorization: `Bearer ${token}` })),
        ),
        fetchedAt,
      };
      const statuses = statusesAt(reading);
      const observations = [
        ...(yield* statuses("favourites", "endorsed")),
        ...(yield* statuses("bookmarks", "collected")),
        ...(yield* followingOf(reading)),
      ];
      return observations;
    }),
});

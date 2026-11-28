import { Effect } from "effect";

import type { ListingKind } from "#/entities/signal";
import { bearerFieldOf } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest-history/api/providers/instance-origin";
import { fetchedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FIELD, LIMIT } from "./api";
import { Accounts, Statuses, Verified } from "./schemas";
import { followedOf, statusOf } from "./subjects";

type Reading = Readonly<{ origin: string; headers: Headers; fetchedAt: number }>;

const statusesAt =
  ({ origin, headers, fetchedAt }: Reading) =>
  (path: string, kind: ListingKind): Observing =>
    fetchJson({
      url: `${origin}/api/v1/${path}?limit=${LIMIT}`,
      headers,
      schema: Statuses,
    }).pipe(Effect.map(fetchedObservationsOf(kind)(statusOf)(fetchedAt)));

const followingOf = ({ origin, headers, fetchedAt }: Reading): Observing =>
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
    return fetchedObservationsOf("followed")(followedOf)(fetchedAt)(accounts);
  });

export const pullMastodon = pullOf({
  provider: "mastodon",
  cursor: "kept",
  observe: ({ credential, fetchedAt }) =>
    Effect.gen(function* mastodon() {
      const reading: Reading = {
        origin: yield* instanceOriginOf(FIELD.instance)(credential),
        headers: yield* bearerFieldOf(FIELD.accessToken)(credential),
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

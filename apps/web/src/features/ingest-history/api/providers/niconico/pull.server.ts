import { Array as Arr, Effect, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { followedCreatorsAt } from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FollowingPage, MylistIndex, MylistPage } from "./schemas";
import { personOf, stampOf, videoSubjectOf } from "./subjects";
import { apiUrlOf, firstPageUrl, pullVideos } from "./videos.server";

const BACKFILL_PAGES = 10;
export const SESSION_COOKIE = "user_session";
export const SESSION_FIELD = "userSession";

const headersOf = (session: string): Readonly<Record<string, string>> => ({
  Cookie: `${SESSION_COOKIE}=${session}`,
  "X-Frontend-Id": "6",
  "X-Frontend-Version": "0",
  "X-Niconico-Language": "ja-jp",
});

const pullMylists = ({ headers, fetchedAt }: Fetching): Observing =>
  Effect.gen(function* mylists() {
    const { data } = yield* fetchJson({
      url: apiUrlOf("/v1/users/me/mylists"),
      headers,
      schema: MylistIndex,
    });
    const collected: Observation[] = [];
    for (const { id, name } of data.mylists) {
      const listed = yield* fetchJson({
        url: firstPageUrl(`/v1/users/me/mylists/${id}`),
        headers,
        schema: MylistPage,
      });
      collected.push(
        ...pipe(
          listed.data.mylist.items,
          Arr.map((entry): Observation => ({
            kind: "collected",
            subject: videoSubjectOf(entry),
            occurredAtMs: stampOf({ entry, fallback: fetchedAt }),
            context: name,
          })),
        ),
      );
    }
    return collected;
  });

const pullFollowing = ({ headers, fetchedAt }: Fetching): Observing =>
  fetchJson({
    url: firstPageUrl("/v1/users/me/following/users"),
    headers,
    schema: FollowingPage,
  }).pipe(
    Effect.map(({ data }) =>
      followedCreatorsAt(({ id, nickname }: (typeof data.items)[number]) =>
        personOf({ id: String(id), name: nickname }),
      )(fetchedAt)(data.items),
    ),
  );

export const pullNiconico = pullOf({
  provider: "niconico",
  cursor: "backfilled",
  backfill: BACKFILL_PAGES,
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* niconico() {
      const session = yield* requireField(credential, SESSION_FIELD);
      const headers = headersOf(session);
      return [
        ...(yield* pullVideos({ headers, pages, fetchedAt })),
        ...(yield* pullMylists({ headers, fetchedAt })),
        ...(yield* pullFollowing({ headers, fetchedAt })),
      ];
    }),
});

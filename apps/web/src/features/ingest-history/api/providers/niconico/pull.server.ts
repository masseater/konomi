import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { flatMapEach, followedCreatorsAt } from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FollowingPage, MylistIndex, MylistPage } from "./schemas.ts";
import { personOf } from "./subjects.ts";
import { apiUrlOf, firstPageUrl, pullVideos, stampedVideosOf } from "./videos.server.ts";

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
  fetchJson({ url: apiUrlOf("/v1/users/me/mylists"), headers, schema: MylistIndex }).pipe(
    Effect.flatMap(({ data }) =>
      flatMapEach(data.mylists, ({ id, name }) =>
        fetchJson({
          url: firstPageUrl(`/v1/users/me/mylists/${id}`),
          headers,
          schema: MylistPage,
        }).pipe(
          Effect.map(({ data: { mylist } }) =>
            stampedVideosOf({ kind: "collected", context: name })(fetchedAt)(mylist.items),
          ),
        ),
      ),
    ),
  );

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

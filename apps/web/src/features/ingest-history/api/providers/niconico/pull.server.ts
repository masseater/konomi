import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { SignalKind } from "#/shared/config";

import { FollowingPage, MylistIndex, MylistPage, VideoPage } from "./schemas";
import type { VideoEntry } from "./schemas";
import { personOf, stampOf, videoSubjectOf } from "./subjects";

const API_ORIGIN = "https://nvapi.nicovideo.jp";
const PAGE_SIZE = 100;
const FIRST_PAGE = 1;
const BACKFILL_PAGES = 10;
export const SESSION_COOKIE = "user_session";
export const SESSION_FIELD = "userSession";

type Fetching = Readonly<{ headers: Readonly<Record<string, string>>; fetchedAt: number }>;

type VideoListing = Readonly<{ path: string; kind: SignalKind }>;

const VIDEO_LISTINGS: readonly VideoListing[] = [
  { path: "/v1/users/me/watch/history", kind: "consumed" },
  { path: "/v1/users/me/likes", kind: "endorsed" },
];

const headersOf = (session: string): Readonly<Record<string, string>> => ({
  Cookie: `${SESSION_COOKIE}=${session}`,
  "X-Frontend-Id": "6",
  "X-Frontend-Version": "0",
  "X-Niconico-Language": "ja-jp",
});

const pageUrl = (path: string, page: number): string =>
  `${API_ORIGIN}${path}?page=${page}&pageSize=${PAGE_SIZE}`;

const observe =
  ({
    kind,
    fetchedAt,
    context,
  }: Readonly<{ kind: SignalKind; fetchedAt: number; context?: string }>) =>
  (entry: VideoEntry): Observation => ({
    kind,
    subject: videoSubjectOf(entry),
    occurredAtMs: stampOf({ entry, fallback: fetchedAt }),
    ...pipe(
      Option.fromUndefinedOr(context),
      Option.map((name) => ({ context: name })),
      Option.getOrElse(() => ({})),
    ),
  });

const pullVideoListing = (
  { headers, fetchedAt }: Fetching,
  pages: number,
  { path, kind }: VideoListing,
): Observing =>
  Effect.gen(function* listing() {
    const toObservation = observe({ kind, fetchedAt });
    const collected: Observation[] = [];
    for (const page of Arr.range(FIRST_PAGE, pages)) {
      const { data } = yield* fetchJson({ url: pageUrl(path, page), headers, schema: VideoPage });
      collected.push(...pipe(data.items, Arr.map(toObservation)));
      if (data.hasNext !== true) {
        break;
      }
    }
    return collected;
  });

const pullMylists = ({ headers, fetchedAt }: Fetching): Observing =>
  Effect.gen(function* mylists() {
    const { data } = yield* fetchJson({
      url: `${API_ORIGIN}/v1/users/me/mylists`,
      headers,
      schema: MylistIndex,
    });
    const collected: Observation[] = [];
    for (const { id, name } of data.mylists) {
      const listed = yield* fetchJson({
        url: pageUrl(`/v1/users/me/mylists/${id}`, FIRST_PAGE),
        headers,
        schema: MylistPage,
      });
      const toObservation = observe({ kind: "collected", fetchedAt, context: name });
      collected.push(...pipe(listed.data.mylist.items, Arr.map(toObservation)));
    }
    return collected;
  });

const pullFollowing = ({ headers, fetchedAt }: Fetching): Observing =>
  fetchJson({
    url: pageUrl("/v1/users/me/following/users", FIRST_PAGE),
    headers,
    schema: FollowingPage,
  }).pipe(
    Effect.map(({ data }) =>
      observationsOf("followed")({
        subjectOf: ({ id, nickname }: (typeof data.items)[number]) => ({
          ...personOf({ id: String(id), name: nickname }),
          credits: [],
          tags: [],
        }),
        occurredAtOf: () => fetchedAt,
      })(data.items),
    ),
  );

export const pullNiconico = pullOf({
  provider: "niconico",
  cursor: "backfilled",
  backfill: BACKFILL_PAGES,
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* niconico() {
      const session = yield* requireField(credential, SESSION_FIELD);
      const fetching: Fetching = {
        headers: headersOf(session),
        fetchedAt,
      };
      const observations: Observation[] = [];
      for (const listing of VIDEO_LISTINGS) {
        observations.push(...(yield* pullVideoListing(fetching, pages, listing)));
      }
      observations.push(...(yield* pullMylists(fetching)), ...(yield* pullFollowing(fetching)));
      return observations;
    }),
});

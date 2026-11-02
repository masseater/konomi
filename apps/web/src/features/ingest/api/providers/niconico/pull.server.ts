import { Array as Arr, Clock, Effect, Match, Option, Schema, String as Str, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";
import type { SignalKind } from "#/shared/config";

import { Cursor, FollowingPage, MylistIndex, MylistPage, VideoPage } from "./schemas";
import type { VideoEntry } from "./schemas";
import { personOf, stampOf, videoSubjectOf } from "./subjects";

const API_ORIGIN = "https://nvapi.nicovideo.jp";
const PAGE_SIZE = 100;
const FIRST_PAGE = 1;
const BACKFILL_PAGES = 10;
const SESSION_COOKIE = "user_session";
const SESSION_FIELD = "userSession";

type Fetching = Readonly<{ headers: Readonly<Record<string, string>>; fetchedAt: number }>;

type VideoListing = Readonly<{ path: string; kind: SignalKind }>;

const VIDEO_LISTINGS: readonly VideoListing[] = [
  { path: "/v1/users/me/watch/history", kind: "consumed" },
  { path: "/v1/users/me/likes", kind: "endorsed" },
];

const CursorJson = Schema.fromJsonString(Cursor);
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

const headersOf = (session: string): Readonly<Record<string, string>> => ({
  Cookie: `${SESSION_COOKIE}=${session}`,
  "X-Frontend-Id": "6",
  "X-Frontend-Version": "0",
  "X-Niconico-Language": "ja-jp",
});

const sessionOf = ({ fields }: Credential): Effect.Effect<string, CredentialRejected> =>
  pipe(
    Option.fromUndefinedOr(fields[SESSION_FIELD]),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
    Effect.fromOption,
    Effect.mapError(() => CredentialRejected.make({ message: "niconico のログインがまだ無い" })),
  );

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
): Effect.Effect<readonly Observation[], ProviderError> =>
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

const pullMylists = ({
  headers,
  fetchedAt,
}: Fetching): Effect.Effect<readonly Observation[], ProviderError> =>
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

const pullFollowing = ({
  headers,
  fetchedAt,
}: Fetching): Effect.Effect<readonly Observation[], ProviderError> =>
  fetchJson({
    url: pageUrl("/v1/users/me/following/users", FIRST_PAGE),
    headers,
    schema: FollowingPage,
  }).pipe(
    Effect.map(({ data }) =>
      pipe(
        data.items,
        Arr.map(({ id, nickname }): Observation => ({
          kind: "followed",
          subject: { ...personOf({ id: String(id), name: nickname }), credits: [], tags: [] },
          occurredAtMs: fetchedAt,
        })),
      ),
    ),
  );

const pagesFor = (backfilled: boolean): number =>
  Match.value(backfilled).pipe(
    Match.when(true, () => FIRST_PAGE),
    Match.orElse(() => BACKFILL_PAGES),
  );

const pullNiconico = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* niconico() {
    const fetching: Fetching = {
      headers: headersOf(yield* sessionOf(credential)),
      fetchedAt: yield* Clock.currentTimeMillis,
    };
    const { backfilled } = pipe(
      decodeCursor(cursor),
      Option.getOrElse(() => ({ backfilled: false })),
    );
    const observations: Observation[] = [];
    for (const listing of VIDEO_LISTINGS) {
      observations.push(...(yield* pullVideoListing(fetching, pagesFor(backfilled), listing)));
    }
    observations.push(...(yield* pullMylists(fetching)), ...(yield* pullFollowing(fetching)));
    return {
      observations,
      cursor: yield* encodeCursor({ backfilled: true }).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("niconico.pull"));

export { SESSION_COOKIE, SESSION_FIELD, pullNiconico };

import { Array as Arr, Clock, Effect, Match, Option, Record as Rec, Schema, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { collectPages, pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, FIELD, LIMIT } from "./api";
import { Cursor, LovedTracks, RecentTracks } from "./schemas";
import type { LastfmTrack, LastfmTrackPage } from "./schemas";
import { trackOf, tracksOf } from "./subjects";

const CursorJson = Schema.fromJsonString(Cursor);
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);
const MS_PER_SECOND = 1000;
const NEXT_PAGE = 1;

type Account = Readonly<{ user: string; apiKey: string }>;

const accountOf = (credential: Credential): Effect.Effect<Account, ProviderError> =>
  Effect.all({
    user: requireField(credential, FIELD.user),
    apiKey: requireField(credential, FIELD.apiKey),
  });

const methodUrl = ({
  account,
  method,
  params,
}: Readonly<{
  account: Account;
  method: string;
  params: Readonly<Record<string, string>>;
}>): string => {
  const url = new URL(API);
  const query = { ...params, method, user: account.user, api_key: account.apiKey };
  for (const [name, value] of Rec.toEntries(query)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(LIMIT));
  return url.toString();
};

const nextOf =
  (url: string) =>
  (page: LastfmTrackPage): Page<LastfmTrack> => ({
    items: tracksOf(page.track),
    next: pipe(
      Option.some(page["@attr"]),
      Option.filter(({ page: current, totalPages }) => current < totalPages),
      Option.map(({ page: current }) => {
        const next = new URL(url);
        next.searchParams.set("page", String(current + NEXT_PAGE));
        return next.toString();
      }),
    ),
  });

const scrobbledAt = (track: LastfmTrack): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(track.date),
    Option.map(({ uts }) => uts * MS_PER_SECOND),
  );

const pullScrobbles = ({
  account,
  pages,
  fromUts,
}: Readonly<{ account: Account; pages: number; fromUts: Option.Option<number> }>): Effect.Effect<
  readonly LastfmTrack[],
  ProviderError
> => {
  const from = pipe(
    fromUts,
    Option.map((uts) => ({ from: String(uts + NEXT_PAGE) })),
    Option.getOrElse(() => ({})),
  );
  return collectPages({
    first: methodUrl({
      account,
      method: "user.getrecenttracks",
      params: { extended: "1", ...from },
    }),
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers: {}, schema: RecentTracks }).pipe(
        Effect.map(({ recenttracks }) => nextOf(url)(recenttracks)),
      ),
  });
};

const pullLoved = ({
  account,
  pages,
  fetchedAt,
}: Readonly<{ account: Account; pages: number; fetchedAt: number }>): Effect.Effect<
  readonly Observation[],
  ProviderError
> =>
  collectPages({
    first: methodUrl({ account, method: "user.getlovedtracks", params: {} }),
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers: {}, schema: LovedTracks }).pipe(
        Effect.map(({ lovedtracks }) => nextOf(url)(lovedtracks)),
      ),
  }).pipe(
    Effect.map(
      Arr.map((track): Observation => ({
        kind: "endorsed",
        subject: trackOf(track),
        occurredAtMs: Option.getOrElse(scrobbledAt(track), () => fetchedAt),
      })),
    ),
  );

const playsOf = (tracks: readonly LastfmTrack[]): readonly Observation[] =>
  pipe(
    tracks,
    Arr.map((track) =>
      pipe(
        scrobbledAt(track),
        Option.map((occurredAtMs): Observation => ({
          kind: "consumed",
          subject: trackOf(track),
          occurredAtMs,
        })),
      ),
    ),
    Arr.getSomes,
  );

const latestUtsOf = (
  tracks: readonly LastfmTrack[],
  previous: Option.Option<number>,
): Option.Option<number> =>
  pipe(
    tracks,
    Arr.map((track) => Option.map(Option.fromNullishOr(track.date), ({ uts }) => uts)),
    Arr.getSomes,
    Arr.appendAll(Option.toArray(previous)),
    Arr.match({ onEmpty: Option.none, onNonEmpty: (all) => Option.some(Math.max(...all)) }),
  );

const pullLastfm = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* lastfm() {
    const account = yield* accountOf(credential);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const previous = pipe(
      decodeCursor(cursor),
      Option.getOrElse((): typeof Cursor.Type => ({ backfilled: false })),
    );
    const pages = pagesFor(previous.backfilled);
    const fromUts = Option.fromUndefinedOr(previous.latestUts);
    const scrobbles = yield* pullScrobbles({ account, pages, fromUts });
    const loved = yield* pullLoved({ account, pages, fetchedAt });
    const latestUts = latestUtsOf(scrobbles, fromUts);
    const next = Match.value(latestUts).pipe(
      Match.when(Option.isSome, ({ value }) => ({ backfilled: true, latestUts: value })),
      Match.orElse(() => ({ backfilled: true })),
    );
    return {
      observations: [...playsOf(scrobbles), ...loved],
      cursor: yield* encodeCursor(next).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("lastfm.pull"));

export { pullLastfm };

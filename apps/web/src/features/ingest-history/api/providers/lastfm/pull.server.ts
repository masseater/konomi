import { Array as Arr, Clock, Effect, Match, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { cursorStateOf } from "#/features/ingest-history/api/providers/cursor-state";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { collectPages, pagesFor } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

import { accountOf, methodUrl, nextOf } from "./methods";
import type { Account } from "./methods";
import { Cursor, LovedTracks, RecentTracks } from "./schemas";
import type { LastfmTrack } from "./schemas";
import { trackOf } from "./subjects";

const cursorState = cursorStateOf(Cursor)({ backfilled: false });
const MS_PER_SECOND = 1000;
const NEXT_PAGE = 1;

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
}: Readonly<{ account: Account; pages: number; fetchedAt: number }>): Observing =>
  collectPages({
    first: methodUrl({ account, method: "user.getlovedtracks", params: {} }),
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers: {}, schema: LovedTracks }).pipe(
        Effect.map(({ lovedtracks }) => nextOf(url)(lovedtracks)),
      ),
  }).pipe(
    Effect.map(
      observationsOf("endorsed")({
        subjectOf: trackOf,
        occurredAtOf: (track) => Option.getOrElse(scrobbledAt(track), () => fetchedAt),
      }),
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

export const pullLastfm = ({
  credential,
  cursor,
}: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* lastfm() {
    const account = yield* accountOf(credential);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const previous = cursorState.read(cursor);
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
      cursor: yield* cursorState.write(next),
    };
  }).pipe(Effect.withSpan("lastfm.pull"));

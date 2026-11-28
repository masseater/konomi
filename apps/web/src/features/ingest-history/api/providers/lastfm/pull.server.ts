import { Array as Arr, Effect, Match, Option, pipe } from "effect";

import { cursorStateOf } from "#/features/ingest-history/api/providers/cursor-state";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import {
  datedObservationsOf,
  observationsOf,
} from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { collectPages, pagesFor } from "#/features/ingest-history/api/providers/paging.server";
import { pullWithState } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { accountOf, methodUrl, nextOf } from "./methods.ts";
import type { Account } from "./methods.ts";
import { Cursor, LovedTracks, RecentTracks } from "./schemas.ts";
import type { LastfmTrack } from "./schemas.ts";
import { trackOf } from "./subjects.ts";

const cursorState = cursorStateOf(Cursor)({ backfilled: false });
const MS_PER_SECOND = 1000;
const NEXT_PAGE = 1;

const scrobbledAt = (track: LastfmTrack): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(track.date),
    Option.map(({ uts }) => uts * MS_PER_SECOND),
  );

const lovedObservationsOf = datedObservationsOf({
  kind: "endorsed",
  subjectOf: (track: LastfmTrack) => Option.some(trackOf(track)),
  occurredAtOf: (track) => Option.getOrUndefined(scrobbledAt(track)),
});

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
  }).pipe(Effect.map(lovedObservationsOf(fetchedAt)));

const playsOf = observationsOf("consumed")((track: LastfmTrack) =>
  Option.map(scrobbledAt(track), (occurredAtMs) => ({
    occurredAtMs,
    subject: trackOf(track),
  })),
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

export const pullLastfm = pullWithState({
  provider: "lastfm",
  state: cursorState,
  pull: ({ credential, state, fetchedAt }) =>
    Effect.gen(function* lastfm() {
      const account = yield* accountOf(credential);
      const pages = pagesFor(state.backfilled);
      const fromUts = Option.fromUndefinedOr(state.latestUts);
      const scrobbles = yield* pullScrobbles({ account, pages, fromUts });
      const loved = yield* pullLoved({ account, pages, fetchedAt });
      const latestUts = latestUtsOf(scrobbles, fromUts);
      return {
        observations: [...playsOf(scrobbles), ...loved],
        state: Match.value(latestUts).pipe(
          Match.when(Option.isSome, ({ value }) => ({ backfilled: true, latestUts: value })),
          Match.orElse(() => ({ backfilled: true })),
        ),
      };
    }),
});

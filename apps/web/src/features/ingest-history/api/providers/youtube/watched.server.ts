import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { fieldOf } from "#/features/ingest-history/api/providers/credential-field";
import { freshOf } from "#/features/ingest-history/api/providers/fresh";
import { fetchedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { HISTORY_FIELD } from "./api.ts";
import { pullHistory } from "./history.server.ts";
import { videoSubjectOf } from "./subjects.ts";
import type { VideoParts } from "./subjects.ts";

const KEPT_HISTORY = 50;

export type Watched = Readonly<{
  observations: readonly Observation[];
  history: readonly string[];
}>;

const watchedOf =
  ({ previous, fetchedAt }: Readonly<{ previous: readonly string[]; fetchedAt: number }>) =>
  (videos: readonly VideoParts[]): Watched => {
    const ids = pipe(
      videos,
      Arr.map(({ id }) => id),
    );
    const fresh = freshOf({ previous, current: ids });
    return {
      observations: pipe(
        videos,
        Arr.take(fresh.length),
        fetchedObservationsOf("consumed")(videoSubjectOf)(fetchedAt),
      ),
      history: pipe(ids, Arr.take(KEPT_HISTORY)),
    };
  };

export const pullWatched = ({
  credential,
  previous,
  fetchedAt,
}: Readonly<{
  credential: Credential;
  previous: readonly string[];
  fetchedAt: number;
}>): Effect.Effect<Watched, ProviderError> =>
  Option.match(fieldOf(credential, HISTORY_FIELD), {
    onNone: () => Effect.succeed({ observations: [], history: previous }),
    onSome: (value) => pullHistory(value).pipe(Effect.map(watchedOf({ previous, fetchedAt }))),
  });

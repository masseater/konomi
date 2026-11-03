import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { fieldOf } from "#/features/ingest/api/providers/credential-field";
import { freshOf } from "#/features/ingest/api/providers/fresh";
import type { ProviderError } from "#/features/ingest/model/provider";

import { HISTORY_FIELD } from "./api";
import { pullHistory } from "./history.server";
import { videoSubjectOf } from "./subjects";
import type { VideoParts } from "./subjects";

const KEPT_HISTORY = 50;

type Watched = Readonly<{ observations: readonly Observation[]; history: readonly string[] }>;

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
        Arr.map((video): Observation => ({
          kind: "consumed",
          subject: videoSubjectOf(video),
          occurredAtMs: fetchedAt,
        })),
      ),
      history: pipe(ids, Arr.take(KEPT_HISTORY)),
    };
  };

const pullWatched = ({
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

export { pullWatched };

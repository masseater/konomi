import { Array as Arr, Effect, Option, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, HEADERS, FIELD, LIMIT, LOVED } from "./api";
import { Feedback, Listens } from "./schemas";
import type { ListenBrainzListen, ListenBrainzLoved } from "./schemas";
import { listenObservationsOf, lovedObservationsOf } from "./subjects";

const OFFSET = "offset";

const fullPageNext =
  ({ url, items }: Readonly<{ url: string; items: readonly unknown[] }>) =>
  (param: Readonly<{ name: string; value: string }>): Option.Option<string> =>
    pipe(
      Option.liftPredicate(items.length, (count: number) => count >= LIMIT),
      Option.map(() => {
        const next = new URL(url);
        next.searchParams.set(param.name, param.value);
        return next.toString();
      }),
    );

const nextOffset = (url: string): string =>
  String(Number(new URL(url).searchParams.get(OFFSET)) + LIMIT);

const pullLoved = ({
  user,
  pages,
}: Readonly<{ user: string; pages: number }>): Effect.Effect<
  readonly ListenBrainzLoved[],
  ProviderError
> =>
  collectPages({
    first: `${API}/feedback/user/${user}/get-feedback?score=${LOVED}&count=${LIMIT}&metadata=true&${OFFSET}=0`,
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers: HEADERS, schema: Feedback }).pipe(
        Effect.map(({ feedback }) => ({
          items: feedback,
          next: fullPageNext({ url, items: feedback })({ name: OFFSET, value: nextOffset(url) }),
        })),
      ),
  });

const pullListens = ({
  user,
  pages,
}: Readonly<{ user: string; pages: number }>): Effect.Effect<
  readonly ListenBrainzListen[],
  ProviderError
> =>
  collectPages({
    first: `${API}/user/${user}/listens?count=${LIMIT}`,
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers: HEADERS, schema: Listens }).pipe(
        Effect.map(({ payload: { listens } }) => ({
          items: listens,
          next: pipe(
            Arr.last(listens),
            Option.flatMap(({ listened_at: listenedAt }) =>
              fullPageNext({ url, items: listens })({ name: "max_ts", value: String(listenedAt) }),
            ),
          ),
        })),
      ),
  });

const pullListenbrainz = ({
  credential,
  cursor,
}: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* listenbrainz() {
    const rawUser = yield* requireField(credential, FIELD.user);
    const user = encodeURIComponent(rawUser);
    const pages = pagesOf(cursor);
    const listens = yield* pullListens({ user, pages });
    const loved = yield* pullLoved({ user, pages });
    return {
      observations: [...listenObservationsOf(listens), ...lovedObservationsOf(loved)],
      cursor: yield* BACKFILLED,
    };
  }).pipe(Effect.withSpan("listenbrainz.pull"));

export { pullListenbrainz };

import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { collectJsonPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

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

type Pulling = Readonly<{ user: string; pages: number }>;

const pullLoved = ({
  user,
  pages,
}: Pulling): Effect.Effect<readonly ListenBrainzLoved[], ProviderError> =>
  collectJsonPages({
    first: `${API}/feedback/user/${user}/get-feedback?score=${LOVED}&count=${LIMIT}&metadata=true&${OFFSET}=0`,
    headers: HEADERS,
    pages,
    schema: Feedback,
    pageOf: ({ feedback }, url) => ({
      items: feedback,
      next: fullPageNext({ url, items: feedback })({ name: OFFSET, value: nextOffset(url) }),
    }),
  });

const pullListens = ({
  user,
  pages,
}: Pulling): Effect.Effect<readonly ListenBrainzListen[], ProviderError> =>
  collectJsonPages({
    first: `${API}/user/${user}/listens?count=${LIMIT}`,
    headers: HEADERS,
    pages,
    schema: Listens,
    pageOf: ({ payload: { listens } }, url) => ({
      items: listens,
      next: pipe(
        Arr.last(listens),
        Option.flatMap(({ listened_at: listenedAt }) =>
          fullPageNext({ url, items: listens })({ name: "max_ts", value: String(listenedAt) }),
        ),
      ),
    }),
  });

export const pullListenbrainz = pullOf({
  provider: "listenbrainz",
  cursor: "backfilled",
  observe: ({ credential, pages }) =>
    Effect.gen(function* listenbrainz() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const listens = yield* pullListens({ user, pages });
      const loved = yield* pullLoved({ user, pages });
      return [...listenObservationsOf(listens), ...lovedObservationsOf(loved)];
    }),
});

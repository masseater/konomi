import { run } from "@r_masseater/workers-tracing/effect";
import { mutationOptions } from "@tanstack/react-query";
import { Effect, Predicate, Schema } from "effect";

import { connectionClient } from "#/features/ingest-history";

import { authorizeMusicKit } from "./musickit.ts";

const TokenBody = Schema.Struct({ token: Schema.NonEmptyString });

const decodeTokenBody = Schema.decodeUnknownEffect(TokenBody);

const connectAppleMusic = (): Promise<unknown> =>
  run(
    Effect.promise(() =>
      connectionClient.api.connections["apple-music"]["developer-token"].get(),
    ).pipe(
      Effect.flatMap(({ data }) => decodeTokenBody(data)),
      Effect.flatMap(({ token }) => authorizeMusicKit(token)),
      Effect.flatMap((token) =>
        Effect.promise(() =>
          connectionClient.api.connections["apple-music"]["user-token"].put({ token }),
        ),
      ),
      Effect.filterOrFail(
        ({ error }) => Predicate.isNull(error),
        () => "保存できなかった",
      ),
    ),
  );

export const connectAppleMusicMutation = mutationOptions({ mutationFn: connectAppleMusic });

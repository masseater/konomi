import { Effect, Option, pipe } from "effect";

import type { ProviderId } from "#/shared/config";

import { appleDeveloperToken, saveAppleUserToken } from "./apple-music.server";
import { finishAuthorization, startAuthorization } from "./connect.server";

const BAD_REQUEST = 400;
const FOUND = 302;

const redirectTo = (
  location: Effect.Effect<string, Readonly<{ message: string }>>,
): Effect.Effect<Response> =>
  location.pipe(
    Effect.match({
      onSuccess: (to) => new Response("", { status: FOUND, headers: { Location: to } }),
      onFailure: ({ message }) => new Response(message, { status: BAD_REQUEST }),
    }),
  );

type Callback = Readonly<{ code?: string | undefined; state?: string | undefined }>;

const callbackResponse = ({
  provider,
  query,
}: Readonly<{ provider: ProviderId; query: Callback }>): Effect.Effect<Response> =>
  pipe(
    Option.all({
      code: Option.fromUndefinedOr(query.code),
      state: Option.fromUndefinedOr(query.state),
    }),
    Effect.fromOption,
    Effect.mapError(() => ({ message: "許可されなかった。やり直す" })),
    Effect.flatMap(({ code, state }) => finishAuthorization({ provider, code, state })),
    redirectTo,
  );

const authorizeResponse = (provider: ProviderId): Effect.Effect<Response> =>
  redirectTo(startAuthorization(provider));

const appleDeveloperTokenResponse: Effect.Effect<Response> = appleDeveloperToken.pipe(
  Effect.match({
    onSuccess: (token) => Response.json({ token }),
    onFailure: ({ message }) => new Response(message, { status: BAD_REQUEST }),
  }),
);

const saveAppleUserTokenResponse = (token: string): Effect.Effect<Response> =>
  saveAppleUserToken(token).pipe(
    Effect.match({
      onSuccess: () => Response.json({ saved: true }),
      onFailure: ({ message }) => new Response(message, { status: BAD_REQUEST }),
    }),
  );

export {
  appleDeveloperTokenResponse,
  authorizeResponse,
  callbackResponse,
  saveAppleUserTokenResponse as saveAppleUserToken,
};

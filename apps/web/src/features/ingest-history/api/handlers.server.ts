import { Effect, Option, Schema, pipe } from "effect";

import { IMPORT_ROWS_PER_REQUEST } from "#/features/ingest-history/model/import-limits";
import type { ProviderId } from "#/shared/config";

import { appleDeveloperToken, saveAppleUserToken } from "./apple-music.server.ts";
import { finishAuthorization, startAuthorization } from "./connect.server.ts";
import { importRows } from "./import.server.ts";
import type { ImportRequest } from "./import.server.ts";

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

export type Callback = Readonly<{ code?: string | undefined; state?: string | undefined }>;

export const callbackResponse = ({
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

export const authorizeResponse = (provider: ProviderId): Effect.Effect<Response> =>
  redirectTo(startAuthorization(provider));

export const appleDeveloperTokenResponse: Effect.Effect<Response> = appleDeveloperToken.pipe(
  Effect.match({
    onSuccess: (token) => Response.json({ token }),
    onFailure: ({ message }) => new Response(message, { status: BAD_REQUEST }),
  }),
);

export const saveAppleUserTokenResponse = (token: string): Effect.Effect<Response> =>
  saveAppleUserToken(token).pipe(
    Effect.match({
      onSuccess: () => Response.json({ saved: true }),
      onFailure: ({ message }) => new Response(message, { status: BAD_REQUEST }),
    }),
  );

const Text = Schema.Record(Schema.String, Schema.String);

const ImportRows = Schema.Array(Text).check(Schema.isMaxLength(IMPORT_ROWS_PER_REQUEST));

export const ImportBody = Schema.toStandardSchemaV1(
  Schema.Struct({ format: Schema.NonEmptyString, rows: ImportRows, fields: Text }),
);

export const importResponse = (request: ImportRequest): Effect.Effect<Response> =>
  importRows(request).pipe(
    Effect.match({
      onSuccess: (recorded) => Response.json({ recorded }),
      onFailure: ({ message }) => new Response(message, { status: BAD_REQUEST }),
    }),
  );

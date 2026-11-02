import type { Schema } from "effect";
import { Effect, Layer, Match } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { SourceError } from "#/features/ingest/model/source-error";
import { SourceUnavailable } from "#/features/ingest/model/source-unavailable";

const OK_MIN = 200;
const OK_MAX = 299;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;

type JsonRequest<Body extends Schema.Top> = Readonly<{
  url: string;
  headers: Readonly<Record<string, string>>;
  schema: Body;
}>;

const failureOf = (url: string, status: number): SourceError =>
  Match.value(status).pipe(
    Match.when(
      (code) => code === UNAUTHORIZED || code === FORBIDDEN,
      () => CredentialRejected.make({ message: `${url} rejected the credential (${status})` }),
    ),
    Match.orElse(() => SourceUnavailable.make({ message: `${url} answered ${status}` })),
  );

const requestWithClient = <Body extends Schema.Top>({
  url,
  headers,
  schema,
}: JsonRequest<Body>): Effect.Effect<
  Body["Type"],
  SourceError,
  HttpClient.HttpClient | Body["DecodingServices"]
> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) => client.get(url, { headers })),
    Effect.catchTag("HttpClientError", () =>
      Effect.fail(SourceUnavailable.make({ message: `${url} did not answer` })),
    ),
    Effect.filterOrFail(
      ({ status }) => status >= OK_MIN && status <= OK_MAX,
      ({ status }) => failureOf(url, status),
    ),
    Effect.flatMap((response) =>
      HttpClientResponse.schemaBodyJson(schema)(response).pipe(
        Effect.catchTags({
          HttpClientError: () =>
            Effect.fail(SourceUnavailable.make({ message: `${url} returned a non-JSON body` })),
          SchemaError: () =>
            Effect.fail(SourceUnavailable.make({ message: `${url} changed its response shape` })),
        }),
      ),
    ),
  );

const fetchJson = <Body extends Schema.Top>(
  request: Readonly<{ url: string; headers: Readonly<Record<string, string>>; schema: Body }>,
): Effect.Effect<Body["Type"], SourceError, Body["DecodingServices"]> =>
  Effect.scoped(
    Layer.build(FetchHttpClient.layer).pipe(
      Effect.flatMap((context) => requestWithClient(request).pipe(Effect.provideContext(context))),
    ),
  ).pipe(Effect.withSpan("source.fetch", { attributes: { url: request.url } }));

export { fetchJson };

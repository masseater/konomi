import type { Schema, Option } from "effect";
import { Array as Arr, Effect, Layer, Match, Option as Opt, Ref } from "effect";
import type { Cookies } from "effect/http";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { CredentialRejected } from "#/features/ingest-history/model/credential-rejected";
import type { ProviderError } from "#/features/ingest-history/model/provider";
import { ProviderUnavailable } from "#/features/ingest-history/model/provider-unavailable";

const OK_MIN = 200;
const OK_MAX = 299;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;

const failureOf = (url: string, status: number): ProviderError =>
  Match.value(status).pipe(
    Match.when(
      (code) => code === UNAUTHORIZED || code === FORBIDDEN,
      () => CredentialRejected.make({ message: `${url} rejected the credential (${status})` }),
    ),
    Match.orElse(() => ProviderUnavailable.make({ message: `${url} answered ${status}` })),
  );

const okResponse = (
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<HttpClientResponse.HttpClientResponse, ProviderError, HttpClient.HttpClient> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) => client.execute(request)),
    Effect.catchTag("HttpClientError", () =>
      Effect.fail(ProviderUnavailable.make({ message: `${request.url} did not answer` })),
    ),
    Effect.filterOrFail(
      ({ status }) => status >= OK_MIN && status <= OK_MAX,
      ({ status }) => failureOf(request.url, status),
    ),
  );

const MAX_REDIRECTS = 10;

export type Browser = Readonly<{
  open: (
    url: string,
  ) => Effect.Effect<Readonly<{ url: string; text: string }>, ProviderUnavailable>;
  submit: (
    form: Readonly<{ url: string; fields: Readonly<Record<string, string>> }>,
  ) => Effect.Effect<Readonly<{ url: string; text: string }>, ProviderUnavailable>;
  cookie: (name: string) => Effect.Effect<Option.Option<string>>;
}>;

const withFetch = <Value, Failure, Requirement>(
  effect: Effect.Effect<Value, Failure, HttpClient.HttpClient | Requirement>,
): Effect.Effect<Value, Failure, Exclude<Requirement, HttpClient.HttpClient>> =>
  FetchHttpClient.layer.pipe(
    Layer.build,
    Effect.flatMap((context) => effect.pipe(Effect.provideContext(context))),
    Effect.scoped,
  );

const pageOf =
  (url: string) =>
  (response: HttpClientResponse.HttpClientResponse): ReturnType<Browser["open"]> =>
    response.text.pipe(
      Effect.mapBoth({
        onSuccess: (text) => ({ url: response.request.url, text }),
        onFailure: () => ProviderUnavailable.make({ message: `${url} was unreadable` }),
      }),
    );

type StoredCookie = (typeof Cookies.empty.cookies)[string];

const openBrowser: Effect.Effect<Browser, never, HttpClient.HttpClient> = Effect.gen(
  function* browser() {
    const jar = yield* Ref.make<readonly StoredCookie[]>([]);
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.withCookiesRef(jar),
      HttpClient.followRedirects(MAX_REDIRECTS),
    );
    const send = (
      url: string,
      request: HttpClientRequest.HttpClientRequest,
    ): ReturnType<Browser["open"]> =>
      client.execute(request).pipe(
        Effect.mapError(() => ProviderUnavailable.make({ message: `${url} did not answer` })),
        Effect.flatMap(pageOf(url)),
      );
    return {
      open: (url) => send(url, HttpClientRequest.get(url)),
      submit: ({ url, fields }) =>
        send(url, HttpClientRequest.post(url).pipe(HttpClientRequest.bodyUrlParams(fields))),
      cookie: (name) =>
        Ref.get(jar).pipe(
          Effect.map((cookies) =>
            Arr.findFirst(cookies, (stored) => stored.name === name).pipe(
              Opt.map((stored) => stored.value),
            ),
          ),
        ),
    };
  },
);

export const browse = <Value, Failure>(
  run: (browser: Browser) => Effect.Effect<Value, Failure>,
): Effect.Effect<Value, Failure> =>
  withFetch(openBrowser.pipe(Effect.flatMap(run))).pipe(
    Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" }),
  );

export type Headers = Readonly<Record<string, string>>;

export type Endpoint = Readonly<{ url: string; headers: Headers }>;

export type Decoded<Body extends Schema.Top, Needs = never> = Effect.Effect<
  Body["Type"],
  ProviderError,
  Body["DecodingServices"] | Needs
>;

const decodedBody =
  <Body extends Schema.Top>(schema: Body, url: string) =>
  (response: HttpClientResponse.HttpClientResponse): Decoded<Body> =>
    HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.catchTags({
        HttpClientError: () =>
          Effect.fail(ProviderUnavailable.make({ message: `${url} returned a non-JSON body` })),
        SchemaError: () =>
          Effect.fail(ProviderUnavailable.make({ message: `${url} changed its response shape` })),
      }),
    );

const sendJson =
  <Body extends Schema.Top>(schema: Body) =>
  <Requirement>(
    built: Effect.Effect<HttpClientRequest.HttpClientRequest, ProviderError, Requirement>,
  ): Decoded<Body, Requirement> =>
    built.pipe(
      Effect.flatMap((request) =>
        okResponse(request).pipe(Effect.flatMap(decodedBody(schema, request.url)), withFetch),
      ),
    );

export const fetchJson = <Body extends Schema.Top>({
  url,
  headers,
  schema,
}: Endpoint & Readonly<{ schema: Body }>): Decoded<Body> =>
  HttpClientRequest.get(url, { headers }).pipe(Effect.succeed, sendJson(schema));

export const postJson = <Payload extends Schema.Top, Body extends Schema.Top>({
  url,
  headers,
  payload,
  body,
  schema,
}: Endpoint & Readonly<{ payload: Payload; body: Payload["Type"]; schema: Body }>): Decoded<
  Body,
  Payload["EncodingServices"]
> =>
  HttpClientRequest.post(url, { headers }).pipe(
    HttpClientRequest.schemaBodyJson(payload)(body),
    Effect.mapError(() => ProviderUnavailable.make({ message: `${url} body was not JSON` })),
    sendJson(schema),
  );

export const postForm = <Body extends Schema.Top>({
  url,
  headers,
  fields,
  schema,
}: Endpoint &
  Readonly<{ fields: Readonly<Record<string, string>>; schema: Body }>): Decoded<Body> =>
  HttpClientRequest.post(url, { headers }).pipe(
    HttpClientRequest.bodyUrlParams(fields),
    Effect.succeed,
    sendJson(schema),
  );

export const fetchText = ({
  url,
  headers,
}: Readonly<{ url: string; headers: Headers }>): Effect.Effect<string, ProviderError> =>
  okResponse(HttpClientRequest.get(url, { headers })).pipe(
    Effect.flatMap((response) =>
      response.text.pipe(
        Effect.mapError(() => ProviderUnavailable.make({ message: `${url} was unreadable` })),
      ),
    ),
    withFetch,
  );

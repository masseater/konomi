import type { Schema, Option } from "effect";
import { Effect, Layer, Match, Ref } from "effect";
import {
  Cookies,
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

const OK_MIN = 200;
const OK_MAX = 299;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;

type JsonRequest<Body extends Schema.Top> = Readonly<{
  request: HttpClientRequest.HttpClientRequest;
  schema: Body;
}>;

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

const requestJson = <Body extends Schema.Top>({
  request,
  schema,
}: JsonRequest<Body>): Effect.Effect<
  Body["Type"],
  ProviderError,
  HttpClient.HttpClient | Body["DecodingServices"]
> =>
  okResponse(request).pipe(
    Effect.flatMap((response) =>
      HttpClientResponse.schemaBodyJson(schema)(response).pipe(
        Effect.catchTags({
          HttpClientError: () =>
            Effect.fail(
              ProviderUnavailable.make({ message: `${request.url} returned a non-JSON body` }),
            ),
          SchemaError: () =>
            Effect.fail(
              ProviderUnavailable.make({ message: `${request.url} changed its response shape` }),
            ),
        }),
      ),
    ),
  );

const MAX_REDIRECTS = 10;

type Browser = Readonly<{
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
  Effect.scoped(
    Layer.build(FetchHttpClient.layer).pipe(
      Effect.flatMap((context) => effect.pipe(Effect.provideContext(context))),
    ),
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

const openBrowser: Effect.Effect<Browser, never, HttpClient.HttpClient> = Effect.gen(
  function* browser() {
    const jar = yield* Ref.make(Cookies.empty);
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
      cookie: (name) => Ref.get(jar).pipe(Effect.map((cookies) => Cookies.getValue(cookies, name))),
    };
  },
);

const browse = <Value, Failure>(
  run: (browser: Browser) => Effect.Effect<Value, Failure>,
): Effect.Effect<Value, Failure> =>
  withFetch(openBrowser.pipe(Effect.flatMap(run))).pipe(
    Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" }),
  );

type Headers = Readonly<Record<string, string>>;

const sendJson = <Body extends Schema.Top>(
  request: HttpClientRequest.HttpClientRequest,
  schema: Body,
): Effect.Effect<Body["Type"], ProviderError, Body["DecodingServices"]> =>
  withFetch(requestJson({ request, schema })).pipe(
    Effect.withSpan("provider.fetch", {
      attributes: { url: request.url, method: request.method },
    }),
  );

const fetchJson = <Body extends Schema.Top>({
  url,
  headers,
  schema,
}: Readonly<{ url: string; headers: Headers; schema: Body }>): Effect.Effect<
  Body["Type"],
  ProviderError,
  Body["DecodingServices"]
> => sendJson(HttpClientRequest.get(url, { headers }), schema);

const postJson = <Payload extends Schema.Top, Body extends Schema.Top>({
  url,
  headers,
  payload,
  body,
  schema,
}: Readonly<{
  url: string;
  headers: Headers;
  payload: Payload;
  body: Payload["Type"];
  schema: Body;
}>): Effect.Effect<
  Body["Type"],
  ProviderError,
  Body["DecodingServices"] | Payload["EncodingServices"]
> =>
  HttpClientRequest.post(url, { headers }).pipe(
    HttpClientRequest.schemaBodyJson(payload)(body),
    Effect.mapError(() => ProviderUnavailable.make({ message: `${url} body was not JSON` })),
    Effect.flatMap((request) => sendJson(request, schema)),
  );

const postForm = <Body extends Schema.Top>({
  url,
  headers,
  fields,
  schema,
}: Readonly<{
  url: string;
  headers: Headers;
  fields: Readonly<Record<string, string>>;
  schema: Body;
}>): Effect.Effect<Body["Type"], ProviderError, Body["DecodingServices"]> =>
  sendJson(
    HttpClientRequest.post(url, { headers }).pipe(HttpClientRequest.bodyUrlParams(fields)),
    schema,
  );

const fetchText = ({
  url,
  headers,
}: Readonly<{ url: string; headers: Headers }>): Effect.Effect<string, ProviderError> =>
  withFetch(
    okResponse(HttpClientRequest.get(url, { headers })).pipe(
      Effect.flatMap((response) =>
        response.text.pipe(
          Effect.mapError(() => ProviderUnavailable.make({ message: `${url} was unreadable` })),
        ),
      ),
    ),
  ).pipe(Effect.withSpan("provider.fetch-text", { attributes: { url } }));

export type { Browser };
export { browse, fetchJson, fetchText, postForm, postJson };

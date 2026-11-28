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

const textOf =
  (url: string) =>
  (response: HttpClientResponse.HttpClientResponse): Effect.Effect<string, ProviderUnavailable> =>
    response.text.pipe(
      Effect.mapError(() => ProviderUnavailable.make({ message: `${url} was unreadable` })),
    );

const pageOf =
  (url: string) =>
  (response: HttpClientResponse.HttpClientResponse): ReturnType<Browser["open"]> =>
    textOf(url)(response).pipe(Effect.map((text) => ({ url: response.request.url, text })));

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

export type Posted<Payload extends Schema.Top = never> =
  | Readonly<{ form: Readonly<Record<string, string>> }>
  | Readonly<{ payload: Payload; value: Payload["Type"] }>;

const isForm = (
  posted: Readonly<Record<string, unknown>>,
): posted is Readonly<{ form: Readonly<Record<string, string>> }> => "form" in posted;

const requestOf = <Payload extends Schema.Top>(
  url: string,
  headers: Headers,
  posted: Option.Option<Posted<Payload>>,
): Effect.Effect<HttpClientRequest.HttpClientRequest, ProviderError, Payload["EncodingServices"]> =>
  Opt.match(posted, {
    onNone: () => Effect.succeed(HttpClientRequest.get(url, { headers })),
    onSome: (body) =>
      Match.value(body).pipe(
        Match.when(isForm, ({ form }) =>
          Effect.succeed(
            HttpClientRequest.post(url, { headers }).pipe(HttpClientRequest.bodyUrlParams(form)),
          ),
        ),
        Match.orElse(({ payload, value }) =>
          HttpClientRequest.post(url, { headers }).pipe(
            HttpClientRequest.schemaBodyJson(payload)(value),
            Effect.mapError(() =>
              ProviderUnavailable.make({ message: `${url} body was not JSON` }),
            ),
          ),
        ),
      ),
  });

export const fetchJson = <Body extends Schema.Top, Payload extends Schema.Top = never>({
  url,
  headers,
  schema,
  post,
}: Endpoint & Readonly<{ schema: Body; post?: Posted<Payload> | undefined }>): Decoded<
  Body,
  Payload["EncodingServices"]
> =>
  requestOf(url, headers, Opt.fromUndefinedOr(post)).pipe(
    Effect.flatMap((request) =>
      okResponse(request).pipe(Effect.flatMap(decodedBody(schema, url)), withFetch),
    ),
  );

export const fetchText = ({
  url,
  headers,
}: Readonly<{ url: string; headers: Headers }>): Effect.Effect<string, ProviderError> =>
  okResponse(HttpClientRequest.get(url, { headers })).pipe(Effect.flatMap(textOf(url)), withFetch);

import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { API, FIELD } from "./api";
import { signDeveloperToken } from "./developer-token.server";
import { Songs, Storefronts } from "./schemas";
import type { AppleSong } from "./schemas";

const API_ORIGIN = new URL(API).origin;

type Headers = Readonly<Record<string, string>>;

const headersOf = (credential: Credential): Effect.Effect<Headers, ProviderError> =>
  Effect.all({
    developerToken: signDeveloperToken(credential),
    userToken: requireField(credential, FIELD.userToken),
  }).pipe(
    Effect.map(({ developerToken, userToken }) => ({
      Authorization: `Bearer ${developerToken}`,
      "Music-User-Token": userToken,
    })),
  );

const absoluteOf = (path: string): string => new URL(path, API_ORIGIN).toString();

const fetchSongs =
  (headers: Headers) =>
  (url: string): Effect.Effect<Page<AppleSong>, ProviderError> =>
    fetchJson({ url: absoluteOf(url), headers, schema: Songs }).pipe(
      Effect.map(({ data, next }) => ({
        items: data,
        next: pipe(Option.fromNullishOr(next), Option.map(absoluteOf)),
      })),
    );

const storefrontOf = (headers: Headers): Effect.Effect<string, ProviderError> =>
  fetchJson({ url: `${API}/me/storefront`, headers, schema: Storefronts }).pipe(
    Effect.map(({ data }) => Arr.headNonEmpty(data).id),
  );

export { fetchSongs, headersOf, storefrontOf };

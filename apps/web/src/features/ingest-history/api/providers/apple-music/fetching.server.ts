import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { bearerOf, requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, FIELD } from "./api";
import { signDeveloperToken } from "./developer-token.server";
import { Songs, Storefronts } from "./schemas";
import type { AppleSong } from "./schemas";

const API_ORIGIN = new URL(API).origin;

export const headersOf = (credential: Credential): Effect.Effect<Headers, ProviderError> =>
  Effect.all(
    {
      developerToken: signDeveloperToken(credential),
      userToken: requireField(credential, FIELD.userToken),
    },
    { concurrency: 1 },
  ).pipe(
    Effect.map(({ developerToken, userToken }) => ({
      ...bearerOf(developerToken),
      "Music-User-Token": userToken,
    })),
  );

const absoluteOf = (path: string): string => new URL(path, API_ORIGIN).toString();

export const fetchSongs =
  (headers: Headers) =>
  (url: string): Effect.Effect<Page<AppleSong>, ProviderError> =>
    fetchJson({ url: absoluteOf(url), headers, schema: Songs }).pipe(
      Effect.map(({ data, next }) => ({
        items: data,
        next: pipe(Option.fromNullishOr(next), Option.map(absoluteOf)),
      })),
    );

export const storefrontOf =
  (headers: Headers) =>
  (known: string | undefined): Effect.Effect<string, ProviderError> =>
    Option.match(Option.fromUndefinedOr(known), {
      onNone: () =>
        fetchJson({ url: `${API}/me/storefront`, headers, schema: Storefronts }).pipe(
          Effect.map(({ data }) => Arr.headNonEmpty(data).id),
        ),
      onSome: Effect.succeed,
    });

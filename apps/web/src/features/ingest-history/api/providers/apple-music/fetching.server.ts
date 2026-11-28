import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { bearerOf, requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { jsonSource } from "#/features/ingest-history/api/providers/listing.server";
import type { Sourcing } from "#/features/ingest-history/api/providers/listing.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, FIELD } from "./api.ts";
import { signDeveloperToken } from "./developer-token.server.ts";
import { Songs, Storefronts } from "./schemas.ts";
import type { AppleSong } from "./schemas.ts";

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

export const songsFrom = (first: string): Sourcing<AppleSong> =>
  jsonSource({
    first,
    schema: Songs,
    pageOf: ({ data, next }) => ({
      items: data,
      next: pipe(Option.fromNullishOr(next), Option.map(absoluteOf)),
    }),
  });

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

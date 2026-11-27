import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { requireFields } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { pagedListing } from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, FIELD, LIMIT } from "./api";

export type Session = Readonly<{
  headers: Readonly<Record<string, string>>;
  clientId: string;
  fetchedAt: number;
}>;

export const sessionOf = ({
  credential,
  fetchedAt,
}: Readonly<{ credential: Credential; fetchedAt: number }>): Effect.Effect<
  Session,
  ProviderError
> =>
  requireFields(credential, { token: FIELD.token, clientId: FIELD.clientId }).pipe(
    Effect.map(({ token, clientId }) => ({
      headers: { Authorization: `OAuth ${token}`, Origin: "https://soundcloud.com" },
      clientId,
      fetchedAt,
    })),
  );

export const firstUrlOf = (path: string): string =>
  `${API}${path}?limit=${LIMIT}&linked_partitioning=1`;

const withClientId =
  (clientId: string) =>
  (url: string): string =>
    urlWith(url, { client_id: clientId });

export const fetchFrom = <Body extends Schema.Top>({
  session: { headers, clientId },
  schema,
}: Readonly<{ session: Session; schema: Body }>): ((
  url: string,
) => Effect.Effect<Body["Type"], ProviderError, Body["DecodingServices"]>) => {
  const sign = withClientId(clientId);
  return (url) => fetchJson({ url: sign(url), headers, schema });
};

export type Collected<Entry> = Readonly<{
  collection: readonly Entry[];
  next_href?: string | null | undefined;
}>;

export const collectionListing =
  (clientId: string) =>
  <Entry>({
    path,
    schema,
    observe,
  }: Readonly<{
    path: string;
    schema: Schema.Decoder<Collected<Entry>>;
    observe: (fetchedAt: number) => (entries: readonly Entry[]) => readonly Observation[];
  }>): Listing => {
    const sign = withClientId(clientId);
    return pagedListing({
      first: sign(firstUrlOf(path)),
      schema,
      pageOf: ({ collection, next_href: next }) => ({
        items: collection,
        next: pipe(Option.fromNullishOr(next), Option.map(sign)),
      }),
      observe,
    });
  };

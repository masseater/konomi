import { Effect, Option } from "effect";
import type { Schema } from "effect";

import type { Credential } from "#/entities/connection";
import { requireFields } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
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
  (url: string): string => {
    const signed = new URL(url);
    signed.searchParams.set("client_id", clientId);
    return signed.toString();
  };

export const fetchFrom = <Body extends Schema.Top>({
  session: { headers, clientId },
  schema,
}: Readonly<{ session: Session; schema: Body }>): ((
  url: string,
) => Effect.Effect<Body["Type"], ProviderError, Body["DecodingServices"]>) => {
  const sign = withClientId(clientId);
  return (url) => fetchJson({ url: sign(url), headers, schema });
};

const collectionPageOf = <Item>({
  collection,
  next_href: nextHref,
}: Readonly<{
  collection: readonly Item[];
  next_href?: string | null | undefined;
}>): Page<Item> => ({
  items: collection,
  next: Option.fromNullishOr(nextHref),
});

export const collectFrom = <Item>({
  session,
  path,
  pages,
  schema,
}: Readonly<{
  session: Session;
  path: string;
  pages: number;
  schema: Schema.Decoder<
    Readonly<{ collection: readonly Item[]; next_href?: string | null | undefined }>
  >;
}>): Effect.Effect<readonly Item[], ProviderError> =>
  collectPages({
    first: firstUrlOf(path),
    pages,
    fetchPage: (url) => fetchFrom({ session, schema })(url).pipe(Effect.map(collectionPageOf)),
  });

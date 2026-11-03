import { Effect, Option } from "effect";
import type { Schema } from "effect";

import type { Credential } from "#/entities/connection";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { API, FIELD, LIMIT } from "./api";

type Session = Readonly<{
  headers: Readonly<Record<string, string>>;
  clientId: string;
  fetchedAt: number;
}>;

const sessionOf = ({
  credential,
  fetchedAt,
}: Readonly<{ credential: Credential; fetchedAt: number }>): Effect.Effect<
  Session,
  ProviderError
> =>
  Effect.all({
    token: requireField(credential, FIELD.token),
    clientId: requireField(credential, FIELD.clientId),
  }).pipe(
    Effect.map(({ token, clientId }) => ({
      headers: { Authorization: `OAuth ${token}`, Origin: "https://soundcloud.com" },
      clientId,
      fetchedAt,
    })),
  );

const firstUrlOf = (path: string): string => `${API}${path}?limit=${LIMIT}&linked_partitioning=1`;

const withClientId =
  (clientId: string) =>
  (url: string): string => {
    const signed = new URL(url);
    signed.searchParams.set("client_id", clientId);
    return signed.toString();
  };

const fetchFrom = <Body extends Schema.Top>({
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

export type { Session };
export { collectionPageOf, fetchFrom, firstUrlOf, sessionOf };

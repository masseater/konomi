import { Option, pipe } from "effect";
import type { Effect } from "effect";

import { requireFields } from "#/features/ingest-history/api/providers/credential-field";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";
import type { ProviderError, PullInput } from "#/features/ingest-history/model/provider";

import { API, FIELD, LIMIT } from "./api.ts";
import type { LastfmTrack, LastfmTrackPage } from "./schemas.ts";
import { tracksOf } from "./subjects.ts";

const NEXT_PAGE = 1;

export type Account = Readonly<{ user: string; apiKey: string }>;

export const accountOf = (
  credential: PullInput["credential"],
): Effect.Effect<Account, ProviderError> =>
  requireFields(credential, { user: FIELD.user, apiKey: FIELD.apiKey });

export const methodUrl = ({
  account,
  method,
  params,
}: Readonly<{
  account: Account;
  method: string;
  params: Readonly<Record<string, string>>;
}>): string =>
  urlWith(API, {
    ...params,
    method,
    user: account.user,
    api_key: account.apiKey,
    format: "json",
    limit: String(LIMIT),
  });

export const nextOf =
  (url: string) =>
  (page: LastfmTrackPage): Page<LastfmTrack> => ({
    items: tracksOf(page.track),
    next: pipe(
      Option.some(page["@attr"]),
      Option.filter(({ page: current, totalPages }) => current < totalPages),
      Option.map(({ page: current }) => urlWith(url, { page: String(current + NEXT_PAGE) })),
    ),
  });

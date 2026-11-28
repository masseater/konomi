import { Match, Option } from "effect";

import type { Observation } from "#/entities/signal";
import {
  pagedListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";
import { urlAdvancing } from "#/features/ingest-history/api/providers/url-with";
import type { SignalKind } from "#/shared/config";

import { VideoPage } from "./schemas";
import type { VideoEntry } from "./schemas";
import { stampOf, videoSubjectOf } from "./subjects";

const API_ORIGIN = "https://nvapi.nicovideo.jp";
const PAGE_SIZE = 100;
const FIRST_PAGE = 1;

export const apiUrlOf = (path: string): string => `${API_ORIGIN}${path}`;

const pageUrl = (path: string, page: number): string =>
  `${apiUrlOf(path)}?page=${page}&pageSize=${PAGE_SIZE}`;

export const firstPageUrl = (path: string): string => pageUrl(path, FIRST_PAGE);

export const stampedVideosOf = ({
  kind,
  fetchedAt,
  context,
}: Readonly<{ kind: SignalKind; fetchedAt: number; context?: string | undefined }>): ((
  entries: readonly VideoEntry[],
) => readonly Observation[]) =>
  observationsOf(kind)({
    subjectOf: videoSubjectOf,
    occurredAtOf: (entry) => stampOf({ entry, fallback: fetchedAt }),
    context,
  });

const videoListing = ({ path, kind }: Readonly<{ path: string; kind: SignalKind }>): Listing =>
  pagedListing({
    first: pageUrl(path, FIRST_PAGE),
    schema: VideoPage,
    pageOf: ({ data }, url) => ({
      items: data.items,
      next: Match.value(data.hasNext === true).pipe(
        Match.when(true, () => Option.some(urlAdvancing(url, { param: "page", step: FIRST_PAGE }))),
        Match.orElse(() => Option.none<string>()),
      ),
    }),
    observe: (fetchedAt) => stampedVideosOf({ kind, fetchedAt }),
  });

export const pullVideos = pulledListings([
  videoListing({ path: "/v1/users/me/watch/history", kind: "consumed" }),
  videoListing({ path: "/v1/users/me/likes", kind: "endorsed" }),
]);

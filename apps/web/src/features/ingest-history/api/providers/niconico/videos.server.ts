import { Match, Option } from "effect";

import {
  jsonSource,
  listingOf,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Observer } from "#/features/ingest-history/api/providers/observe";
import { urlAdvancing } from "#/features/ingest-history/api/providers/url-with";
import type { SignalKind } from "#/shared/config";

import { VideoPage } from "./schemas.ts";
import type { VideoEntry } from "./schemas.ts";
import { stampOf, videoSubjectOf } from "./subjects.ts";

const API_ORIGIN = "https://nvapi.nicovideo.jp";
const PAGE_SIZE = 100;
const FIRST_PAGE = 1;

export const apiUrlOf = (path: string): string => `${API_ORIGIN}${path}`;

const pageUrl = (path: string, page: number): string =>
  `${apiUrlOf(path)}?page=${page}&pageSize=${PAGE_SIZE}`;

export const firstPageUrl = (path: string): string => pageUrl(path, FIRST_PAGE);

export const stampedVideosOf = ({
  kind,
  context,
}: Readonly<{ kind: SignalKind; context?: string | undefined }>): Observer<VideoEntry> =>
  datedObservationsOf({
    kind,
    subjectOf: (entry) => Option.some(videoSubjectOf(entry)),
    occurredAtOf: stampOf,
    contextOf: () => Option.fromUndefinedOr(context),
  });

const videoListing = ({ path, kind }: Readonly<{ path: string; kind: SignalKind }>): Listing =>
  listingOf({
    label: path,
    source: jsonSource({
      first: pageUrl(path, FIRST_PAGE),
      schema: VideoPage,
      pageOf: ({ data }, url) => ({
        items: data.items,
        next: Match.value(data.hasNext === true).pipe(
          Match.when(true, () =>
            Option.some(urlAdvancing(url, { param: "page", step: FIRST_PAGE })),
          ),
          Match.orElse(() => Option.none<string>()),
        ),
      }),
    }),
  })(stampedVideosOf({ kind }));

export const pullVideos = pulledListings([
  videoListing({ path: "/v1/users/me/watch/history", kind: "consumed" }),
  videoListing({ path: "/v1/users/me/likes", kind: "endorsed" }),
]);

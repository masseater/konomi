import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api.ts";
import { TOKEN_NEXT } from "./page.ts";
import { Subscriptions, Videos } from "./schemas.ts";
import { subscribedChannelOf, videoOf } from "./subjects.ts";

const pullLiked = listingOf({
  label: "liked",
  source: sourceOf({
    first: `${API}/videos?myRating=like&part=snippet,contentDetails&maxResults=${LIMIT}`,
    schema: Videos,
    items: ({ items }) => items,
    next: TOKEN_NEXT,
  }),
})(
  datedObservationsOf({
    kind: "endorsed",
    subjectOf: videoOf,
  }),
);

const pullSubscriptions = listingOf({
  label: "subscriptions",
  source: sourceOf({
    first: `${API}/subscriptions?mine=true&part=snippet&maxResults=${LIMIT}`,
    schema: Subscriptions,
    items: ({ items }) => items,
    next: TOKEN_NEXT,
  }),
})(
  datedObservationsOf({
    kind: "followed",
    subjectOf: (subscription) => subscribedChannelOf(subscription),
    occurredAtOf: (item) => item.snippet.publishedAt,
  }),
);

export const pullLibrary = pulledListings([pullLiked, pullSubscriptions]);

import { Option } from "effect";

import { listingOf, pulledListings } from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api.ts";
import { tokenSource } from "./page.ts";
import { Subscriptions, Videos } from "./schemas.ts";
import { likedVideoOf, subscribedChannelOf } from "./subjects.ts";

const pullLiked = listingOf({
  label: "liked",
  source: tokenSource({
    first: `${API}/videos?myRating=like&part=snippet,contentDetails&maxResults=${LIMIT}`,
    schema: Videos,
  }),
})(
  datedObservationsOf({
    kind: "endorsed",
    subjectOf: (video) => Option.some(likedVideoOf(video)),
  }),
);

const pullSubscriptions = listingOf({
  label: "subscriptions",
  source: tokenSource({
    first: `${API}/subscriptions?mine=true&part=snippet&maxResults=${LIMIT}`,
    schema: Subscriptions,
  }),
})(
  datedObservationsOf({
    kind: "followed",
    subjectOf: (subscription) => subscribedChannelOf(subscription),
    occurredAtOf: (item) => item.snippet.publishedAt,
  }),
);

export const pullLibrary = pulledListings([pullLiked, pullSubscriptions]);

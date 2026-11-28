import { Option } from "effect";

import {
  jsonListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";

import { API, LIMIT } from "./api.ts";
import { tokenPageOf } from "./page.ts";
import { Subscriptions, Videos } from "./schemas.ts";
import { likedVideoOf, subscribedChannelOf } from "./subjects.ts";

const pullLiked = jsonListing({
  kind: "endorsed",
  first: `${API}/videos?myRating=like&part=snippet,contentDetails&maxResults=${LIMIT}`,
  schema: Videos,
  pageOf: (body, url) => tokenPageOf(url)(body),
  subjectOf: (video) => Option.some(likedVideoOf(video)),
});

const pullSubscriptions = jsonListing({
  kind: "followed",
  first: `${API}/subscriptions?mine=true&part=snippet&maxResults=${LIMIT}`,
  schema: Subscriptions,
  pageOf: (body, url) => tokenPageOf(url)(body),
  subjectOf: (subscription) => subscribedChannelOf(subscription),
  occurredAtOf: (item) => item.snippet.publishedAt,
});

export const pullLibrary = pulledListings([pullLiked, pullSubscriptions]);

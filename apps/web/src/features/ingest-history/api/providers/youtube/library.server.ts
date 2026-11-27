import { Option } from "effect";

import { jsonListing } from "#/features/ingest-history/api/providers/listing.server";

import { API, LIMIT } from "./api";
import { tokenPageOf } from "./page";
import { Subscriptions, Videos } from "./schemas";
import { likedVideoOf, subscribedChannelOf } from "./subjects";

export const pullLiked = jsonListing({
  kind: "endorsed",
  first: `${API}/videos?myRating=like&part=snippet,contentDetails&maxResults=${LIMIT}`,
  schema: Videos,
  pageOf: (body, url) => tokenPageOf(url)(body),
  subjectOf: (video) => Option.some(likedVideoOf(video)),
});

export const pullSubscriptions = jsonListing({
  kind: "followed",
  first: `${API}/subscriptions?mine=true&part=snippet&maxResults=${LIMIT}`,
  schema: Subscriptions,
  pageOf: (body, url) => tokenPageOf(url)(body),
  subjectOf: (subscription) => subscribedChannelOf(subscription),
  occurredAtOf: (item) => item.snippet.publishedAt,
});

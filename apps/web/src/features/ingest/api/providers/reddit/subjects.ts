import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { postTitleOf } from "#/features/ingest/api/providers/post-title";

import { WEB } from "./api";
import type { RedditThing } from "./schemas";

const MS_PER_SECOND = 1000;

const authorOf = (author: string): CreatorInput => ({
  provider: "reddit",
  externalId: `u/${author}`,
  type: "person",
  title: author,
  url: `${WEB}/user/${author}`,
});

const thingOf = ({ data }: RedditThing): SubjectInput => {
  const url = pipe(
    Option.fromNullishOr(data.permalink),
    Option.map((permalink) => `${WEB}${permalink}`),
    Option.getOrElse(() => `${WEB}/by_id/${data.name}`),
  );
  const text = pipe(
    [data.title, data.link_title, data.body],
    Arr.map(Option.fromNullishOr),
    Arr.getSomes,
    Arr.head,
  );
  return {
    provider: "reddit",
    externalId: data.name,
    type: "post",
    title: postTitleOf({ text, fallback: url }),
    url,
    ...pipe(
      Option.fromNullishOr(data.created_utc),
      Option.map((seconds) => ({ publishedAtMs: seconds * MS_PER_SECOND })),
      Option.getOrElse(() => ({})),
    ),
    credits: pipe(
      Option.fromNullishOr(data.author),
      Option.filter((author) => author !== "[deleted]"),
      Option.map(authorOf),
      Option.toArray,
    ),
    tags: pipe(
      Option.fromNullishOr(data.subreddit),
      Option.map((subreddit) => `r/${subreddit}`),
      Option.toArray,
    ),
  };
};

export { thingOf };

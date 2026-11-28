import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorFrom, linkedBy } from "#/features/ingest-history/api/providers/creator-input";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api.ts";
import type { RedditThing } from "./schemas.ts";

const MS_PER_SECOND = 1000;

const personOf = creatorFrom({ provider: "reddit" })(
  linkedBy({ idPrefix: "u/", urlBase: `${WEB}/user/` }),
);

const authorOf = (author: string): CreatorInput => personOf({ id: author, name: author });

export const thingOf = ({ data }: RedditThing): SubjectInput => {
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
  return subjectIn("reddit")({
    externalId: data.name,
    type: "post",
    text,
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
  });
};

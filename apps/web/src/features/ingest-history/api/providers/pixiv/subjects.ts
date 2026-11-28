import type { PixivUser } from "@book000/pixivts";
import { Array as Arr, Function as Fn, Option, pipe } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { creatorMapper } from "#/features/ingest-history/api/providers/creator-input";
import {
  datedObservationsOf,
  followedCreatorsAt,
} from "#/features/ingest-history/api/providers/observe";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api.ts";

type User = Pick<PixivUser, "id" | "name">;
type Work = Readonly<{
  id: number;
  title: string;
  user: User;
  tags: readonly Readonly<{ name: string }>[];
  createDate: string;
}>;

const creatorOf = creatorMapper({ provider: "pixiv", idPrefix: "user:", urlBase: `${WEB}/users/` });

const workOf =
  ({ kind, url }: Readonly<{ kind: "artwork" | "book"; url: (id: number) => string }>) =>
  (work: Work): SubjectInput =>
    subjectIn("pixiv")({
      externalId: `${kind}:${work.id}`,
      type: kind,
      title: work.title,
      url: url(work.id),
      publishedAtMs: Date.parse(work.createDate),
      credits: [creatorOf(work.user)],
      tags: pipe(
        work.tags,
        Arr.map(({ name }) => name),
      ),
    });

const illustOf = workOf({ kind: "artwork", url: (id) => `${WEB}/artworks/${id}` });
const novelOf = workOf({ kind: "book", url: (id) => `${WEB}/novel/show.php?id=${id}` });

export const illustObservationsOf = datedObservationsOf({
  kind: "collected",
  subjectOf: Fn.flow(illustOf, Option.some),
});

export const novelObservationsOf = datedObservationsOf({
  kind: "collected",
  subjectOf: Fn.flow(novelOf, Option.some),
});

export const followObservationsOf = followedCreatorsAt(creatorOf);

import type { PixivUser } from "@book000/pixivts";
import { Array as Arr, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import {
  observationsOf,
  personMapper,
  followedCreatorsAt,
} from "#/features/ingest-history/api/providers/observe";

import { WEB } from "./api";

export type User = Pick<PixivUser, "id" | "name">;
export type Work = Readonly<{
  id: number;
  title: string;
  user: User;
  tags: readonly Readonly<{ name: string }>[];
  createDate: string;
}>;

const creatorOf = personMapper({ provider: "pixiv", idPrefix: "user:", urlBase: `${WEB}/users/` });

const workOf =
  ({ kind, url }: Readonly<{ kind: "artwork" | "book"; url: (id: number) => string }>) =>
  (work: Work): SubjectInput => ({
    provider: "pixiv",
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

export const illustObservationsOf =
  (fetchedAt: number) =>
  (illusts: readonly Work[]): readonly Observation[] =>
    observationsOf("collected")({ subjectOf: illustOf, occurredAtOf: () => fetchedAt })(illusts);

export const novelObservationsOf =
  (fetchedAt: number) =>
  (novels: readonly Work[]): readonly Observation[] =>
    observationsOf("collected")({ subjectOf: novelOf, occurredAtOf: () => fetchedAt })(novels);

export const followObservationsOf = followedCreatorsAt(creatorOf);

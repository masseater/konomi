import type { PixivUser } from "@book000/pixivts";
import { Array as Arr, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { followedBy } from "#/features/ingest-history/api/providers/observe";

import { WEB } from "./api";

export type User = Pick<PixivUser, "id" | "name">;
export type Work = Readonly<{
  id: number;
  title: string;
  user: User;
  tags: readonly Readonly<{ name: string }>[];
  createDate: string;
}>;

const creatorOf = ({ id, name }: User): CreatorInput => ({
  provider: "pixiv",
  externalId: `user:${id}`,
  type: "person",
  title: name,
  url: `${WEB}/users/${id}`,
});

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

const collectedAt =
  (fetchedAt: number) =>
  (subject: SubjectInput): Observation => ({ kind: "collected", subject, occurredAtMs: fetchedAt });

export const illustObservationsOf =
  (fetchedAt: number) =>
  (illusts: readonly Work[]): readonly Observation[] =>
    pipe(illusts, Arr.map(illustOf), Arr.map(collectedAt(fetchedAt)));

export const novelObservationsOf =
  (fetchedAt: number) =>
  (novels: readonly Work[]): readonly Observation[] =>
    pipe(novels, Arr.map(novelOf), Arr.map(collectedAt(fetchedAt)));

export const followObservationsOf = (fetchedAt: number) =>
  followedBy({
    subjectOf: (user: User) => ({ ...creatorOf(user), credits: [], tags: [] }),
    occurredAtOf: () => fetchedAt,
  });

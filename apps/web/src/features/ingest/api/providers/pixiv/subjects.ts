import type { PixivUser } from "@book000/pixivts";
import { Array as Arr, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";

import { WEB } from "./api";

type User = Pick<PixivUser, "id" | "name">;
type Work = Readonly<{
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

const illustObservationsOf =
  (fetchedAt: number) =>
  (illusts: readonly Work[]): readonly Observation[] =>
    pipe(illusts, Arr.map(illustOf), Arr.map(collectedAt(fetchedAt)));

const novelObservationsOf =
  (fetchedAt: number) =>
  (novels: readonly Work[]): readonly Observation[] =>
    pipe(novels, Arr.map(novelOf), Arr.map(collectedAt(fetchedAt)));

const followObservationsOf =
  (fetchedAt: number) =>
  (users: readonly User[]): readonly Observation[] =>
    pipe(
      users,
      Arr.map((user) => ({
        kind: "followed" as const,
        subject: { ...creatorOf(user), credits: [], tags: [] },
        occurredAtMs: fetchedAt,
      })),
    );

export type { User, Work };
export { followObservationsOf, illustObservationsOf, novelObservationsOf };

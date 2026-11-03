import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import type { SubjectType } from "#/shared/config";

import { AUTHOR_TAG, WEB } from "./api";
import type { VrchatFriend, VrchatWork } from "./schemas";

type WorkKind = "world" | "avatar";

const TYPE_OF: Readonly<Record<WorkKind, SubjectType>> = { world: "world", avatar: "item" };

const personOf = ({ id, name }: Readonly<{ id: string; name: string }>): CreatorInput => ({
  provider: "vrchat",
  externalId: `user:${id}`,
  type: "person",
  title: name,
  url: `${WEB}/user/${id}`,
});

const authorTagsOf = (tags: readonly string[] | undefined): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(tags),
    Option.getOrElse((): readonly string[] => []),
    Arr.filter(Str.startsWith(AUTHOR_TAG)),
    Arr.map(Str.slice(AUTHOR_TAG.length)),
  );

const workOf =
  (kind: WorkKind) =>
  (work: VrchatWork): SubjectInput => ({
    provider: "vrchat",
    externalId: `${kind}:${work.id}`,
    type: TYPE_OF[kind],
    title: work.name,
    url: `${WEB}/${kind}/${work.id}`,
    credits: pipe(
      Option.fromUndefinedOr(work.authorId),
      Option.map((id) => personOf({ id, name: work.authorName })),
      Option.toArray,
    ),
    tags: authorTagsOf(work.tags),
  });

const favoriteObservationsOf =
  ({ kind, fetchedAt }: Readonly<{ kind: WorkKind; fetchedAt: number }>) =>
  (works: readonly VrchatWork[]): readonly Observation[] =>
    pipe(
      works,
      Arr.map((work) => ({
        kind: "collected" as const,
        subject: workOf(kind)(work),
        occurredAtMs: fetchedAt,
      })),
    );

const friendObservationsOf =
  (fetchedAt: number) =>
  (friends: readonly VrchatFriend[]): readonly Observation[] =>
    pipe(
      friends,
      Arr.map(({ id, displayName }) => ({
        kind: "followed" as const,
        subject: { ...personOf({ id, name: displayName }), credits: [], tags: [] },
        occurredAtMs: fetchedAt,
      })),
    );

export type { WorkKind };
export { favoriteObservationsOf, friendObservationsOf };

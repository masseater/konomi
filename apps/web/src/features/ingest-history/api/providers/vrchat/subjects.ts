import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import {
  observationsOf,
  personMapper,
  followedCreatorsAt,
} from "#/features/ingest-history/api/providers/observe";
import type { SubjectType } from "#/shared/config";

import { AUTHOR_TAG, WEB } from "./api";
import type { VrchatFriend, VrchatWork } from "./schemas";

export type WorkKind = "world" | "avatar";

const TYPE_OF: Readonly<Record<WorkKind, SubjectType>> = { world: "world", avatar: "item" };

const personOf = personMapper({ provider: "vrchat", idPrefix: "user:", urlBase: `${WEB}/user/` });

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

export const favoriteObservationsOf =
  ({ kind, fetchedAt }: Readonly<{ kind: WorkKind; fetchedAt: number }>) =>
  (works: readonly VrchatWork[]): readonly Observation[] =>
    observationsOf("collected")({ subjectOf: workOf(kind), occurredAtOf: () => fetchedAt })(works);

export const friendObservationsOf = followedCreatorsAt(({ id, displayName }: VrchatFriend) =>
  personOf({ id, name: displayName }),
);

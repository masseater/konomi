import { Array as Arr, Option, String as Str, pipe, Function as Fn } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { creatorFrom, linkedBy } from "#/features/ingest-history/api/providers/creator-input";
import {
  datedObservationsOf,
  followedCreatorsAt,
} from "#/features/ingest-history/api/providers/observe";
import type { Observer } from "#/features/ingest-history/api/providers/observe";
import { orEmpty, subjectIn } from "#/features/ingest-history/api/providers/subject-in";
import type { SubjectType } from "#/shared/config";

import { AUTHOR_TAG, WEB } from "./api.ts";
import type { VrchatFriend, VrchatWork } from "./schemas.ts";

export type WorkKind = "world" | "avatar";

const TYPE_OF: Readonly<Record<WorkKind, SubjectType>> = { world: "world", avatar: "item" };

const personOf = creatorFrom({ provider: "vrchat" })(
  linkedBy({ idPrefix: "user:", urlBase: `${WEB}/user/` }),
);

const authorTagsOf = (tags: readonly string[] | undefined): readonly string[] =>
  pipe(
    orEmpty(tags),
    Arr.filter(Str.startsWith(AUTHOR_TAG)),
    Arr.map(Str.slice(AUTHOR_TAG.length)),
  );

const workOf =
  (kind: WorkKind) =>
  (work: VrchatWork): SubjectInput =>
    subjectIn("vrchat")({
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

export const favoriteObservationsOf = (kind: WorkKind): Observer<VrchatWork> =>
  datedObservationsOf({ kind: "collected", subjectOf: Fn.flow(workOf(kind), Option.some) });

export const friendObservationsOf = followedCreatorsAt(({ id, displayName }: VrchatFriend) =>
  personOf({ id, name: displayName }),
);

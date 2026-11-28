import { Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorIn, withoutRelations } from "#/features/ingest-history/api/providers/creator-input";
import { nonEmptyOr } from "#/features/ingest-history/api/providers/observe";
import { orEmpty, textSubjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { MisskeyNote, MisskeyUser } from "./schemas.ts";

const accountOf =
  (origin: string) =>
  (user: MisskeyUser): CreatorInput => {
    const acct = pipe(
      Option.fromNullishOr(user.host),
      Option.map((host) => `${user.username}@${host}`),
      Option.getOrElse(() => user.username),
    );
    return creatorIn("misskey")({
      externalId: `${origin}/users/${user.id}`,
      title: nonEmptyOr(acct)(user.name),
      url: `${origin}/@${acct}`,
    });
  };

export const followedOf =
  (origin: string) =>
  (user: MisskeyUser): SubjectInput =>
    withoutRelations(accountOf(origin)(user));

export const noteOf =
  (origin: string) =>
  (note: MisskeyNote): SubjectInput => {
    const url = `${origin}/notes/${note.id}`;
    return textSubjectIn("misskey")({
      externalId: url,
      type: "post",
      text: Option.fromNullishOr(note.text),
      url,
      publishedAt: note.createdAt,
      credits: [accountOf(origin)(note.user)],
      tags: orEmpty(note.tags),
    });
  };

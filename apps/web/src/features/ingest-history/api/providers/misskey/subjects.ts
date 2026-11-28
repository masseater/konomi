import { Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import {
  creatorFrom,
  withoutRelations,
} from "#/features/ingest-history/api/providers/creator-input";
import { textOr } from "#/features/ingest-history/api/providers/non-blank";
import { orEmpty, subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { MisskeyNote, MisskeyUser } from "./schemas.ts";

const acctOf = ({ username, host }: MisskeyUser): string =>
  pipe(
    Option.fromNullishOr(host),
    Option.map((name) => `${username}@${name}`),
    Option.getOrElse(() => username),
  );

const accountOf = (origin: string): ((user: MisskeyUser) => CreatorInput) =>
  creatorFrom({ provider: "misskey" })({
    externalId: ({ id }) => `${origin}/users/${id}`,
    title: (user) => textOr(acctOf(user))(user.name),
    url: (user) => `${origin}/@${acctOf(user)}`,
  });

export const followedOf =
  (origin: string) =>
  (user: MisskeyUser): SubjectInput =>
    withoutRelations(accountOf(origin)(user));

export const noteOf =
  (origin: string) =>
  (note: MisskeyNote): SubjectInput => {
    const url = `${origin}/notes/${note.id}`;
    return subjectIn("misskey")({
      externalId: url,
      type: "post",
      text: Option.fromNullishOr(note.text),
      url,
      publishedAt: note.createdAt,
      credits: [accountOf(origin)(note.user)],
      tags: orEmpty(note.tags),
    });
  };

import { Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { withRelations, personInputOf } from "#/features/ingest-history/api/providers/observe";
import { postTitleOf } from "#/features/ingest-history/api/providers/post-title";
import { publishedOf } from "#/features/ingest-history/api/providers/subject-fields";

import type { MisskeyNote, MisskeyUser } from "./schemas";

const accountOf =
  (origin: string) =>
  (user: MisskeyUser): CreatorInput => {
    const acct = pipe(
      Option.fromNullishOr(user.host),
      Option.map((host) => `${user.username}@${host}`),
      Option.getOrElse(() => user.username),
    );
    return personInputOf({
      provider: "misskey",
      externalId: `${origin}/users/${user.id}`,
      title: pipe(
        Option.fromNullishOr(user.name),
        Option.filter(Str.isNonEmpty),
        Option.getOrElse(() => acct),
      ),
      url: `${origin}/@${acct}`,
    });
  };

export const followedOf =
  (origin: string) =>
  (user: MisskeyUser): SubjectInput =>
    withRelations({ credits: [], tags: [] })(accountOf(origin)(user));

export const noteOf =
  (origin: string) =>
  (note: MisskeyNote): SubjectInput => {
    const url = `${origin}/notes/${note.id}`;
    return {
      provider: "misskey",
      externalId: url,
      type: "post",
      title: postTitleOf({ text: Option.fromNullishOr(note.text), fallback: url }),
      url,
      ...publishedOf(Option.some(note.createdAt)),
      credits: [accountOf(origin)(note.user)],
      tags: pipe(
        Option.fromNullishOr(note.tags),
        Option.getOrElse((): readonly string[] => []),
      ),
    };
  };

import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";
import type { SignalKind } from "#/shared/config";

import { WEB } from "./api";
import type { OpenLibraryEntry } from "./schemas";

const namesOf = (names: readonly string[] | null | undefined): readonly string[] =>
  pipe(
    Option.fromNullishOr(names),
    Option.getOrElse((): readonly string[] => []),
  );

const authorsOf = (work: OpenLibraryEntry["work"]): readonly CreatorInput[] =>
  pipe(
    Arr.zip(namesOf(work.author_keys), namesOf(work.author_names)),
    Arr.map(([key, title]): CreatorInput => ({
      provider: "openlibrary",
      externalId: key,
      type: "person",
      title,
      url: `${WEB}${key}`,
    })),
  );

const bookOf = (work: OpenLibraryEntry["work"]): SubjectInput => ({
  provider: "openlibrary",
  externalId: work.key,
  type: "book",
  title: work.title,
  url: `${WEB}${work.key}`,
  credits: authorsOf(work),
  tags: pipe(Option.fromNullishOr(work.first_publish_year), Option.map(String), Option.toArray),
});

const isoOf = (logged: string | null | undefined): string | undefined =>
  pipe(
    Option.fromNullishOr(logged),
    Option.map((text) => pipe(text, Str.replace(", ", "T"), Str.replaceAll("/", "-"))),
    Option.map((iso) => `${iso}Z`),
    Option.getOrUndefined,
  );

const shelfObservationsOf =
  ({
    kind,
    context,
    fetchedAt,
  }: Readonly<{ kind: SignalKind; context: string; fetchedAt: number }>) =>
  (entries: readonly OpenLibraryEntry[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      entries,
      Arr.map((entry): Observation => ({
        kind,
        subject: bookOf(entry.work),
        occurredAtMs: at(isoOf(entry.logged_date)),
        context,
      })),
    );
  };

export { shelfObservationsOf };

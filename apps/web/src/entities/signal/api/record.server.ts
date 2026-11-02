import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, Match, pipe } from "effect";

import type { CreatorInput, Observation } from "#/entities/signal/model/observation";
import { credit, signal, subject, subjectTag } from "#/entities/signal/model/signal.table";
import { subjectKeyOf } from "#/entities/signal/model/subject-key";
import { EVENT_SIGNAL_KINDS } from "#/shared/config";
import type { SignalKind } from "#/shared/config";
import { db } from "#/shared/db/index.server";

const STATEMENTS_PER_BATCH = 50;
const NO_CONTEXT = "";
const STATE_OCCURRENCE = "";

const isEvent = (kind: SignalKind): boolean =>
  pipe(
    EVENT_SIGNAL_KINDS,
    Arr.some((event) => event === kind),
  );

const upsertSubject = (input: CreatorInput): BatchItem<"sqlite"> => {
  const fields = {
    title: input.title,
    url: input.url,
    durationSec: input.durationSec,
    publishedAtMs: input.publishedAtMs,
  };
  return db
    .insert(subject)
    .values({ key: subjectKeyOf(input), provider: input.provider, type: input.type, ...fields })
    .onConflictDoUpdate({ target: subject.key, set: fields });
};

const subjectStatements = (observation: Observation): readonly BatchItem<"sqlite">[] => [
  ...pipe(observation.subject.credits, Arr.map(upsertSubject)),
  upsertSubject(observation.subject),
];

const linkStatements = ({
  subject: input,
  kind,
  context,
  occurredAtMs,
}: Observation): readonly BatchItem<"sqlite">[] => {
  const subjectKey = subjectKeyOf(input);
  const credits = pipe(
    input.credits,
    Arr.map((creator) =>
      db
        .insert(credit)
        .values({ subjectKey, creatorKey: subjectKeyOf(creator) })
        .onConflictDoNothing(),
    ),
  );
  const tags = pipe(
    input.tags,
    Arr.map((tag) => db.insert(subjectTag).values({ subjectKey, tag }).onConflictDoNothing()),
  );
  const occurrence = Match.value(isEvent(kind)).pipe(
    Match.when(true, () => String(occurredAtMs)),
    Match.orElse(() => STATE_OCCURRENCE),
  );
  const recorded = db
    .insert(signal)
    .values({
      subjectKey,
      kind,
      context: context ?? NO_CONTEXT,
      occurrence,
      occurredAtMs,
    })
    .onConflictDoNothing();
  return [...credits, ...tags, recorded];
};

const runStatements = (statements: readonly BatchItem<"sqlite">[]): Effect.Effect<void> =>
  Effect.forEach(
    Arr.chunksOf(statements, STATEMENTS_PER_BATCH),
    (batch) => Effect.promise(() => db.batch(batch)),
    { discard: true },
  );

const recordObservations = (observations: readonly Observation[]): Effect.Effect<number> => {
  const subjects = pipe(observations, Arr.flatMap(subjectStatements));
  const links = pipe(observations, Arr.flatMap(linkStatements));
  return runStatements(subjects).pipe(
    Effect.andThen(runStatements(links)),
    Effect.as(observations.length),
    Effect.withSpan("signal.record", { attributes: { observations: observations.length } }),
  );
};

export { recordObservations };

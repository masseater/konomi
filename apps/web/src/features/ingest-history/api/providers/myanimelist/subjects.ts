import { Array as Arr, Match, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr, listEntryObservationsOf } from "#/features/ingest-history/api/providers/observe";

import { WEB } from "./api";
import type { LISTS } from "./api";
import type { MalEntry, MalGenre } from "./schemas";

export type MalList = (typeof LISTS)[number];

const LIKED_SCORE = 8;
const STATUS_LABEL: Readonly<Record<string, string>> = {
  watching: "見てる",
  reading: "読んでる",
  completed: "見た・読んだ",
  on_hold: "止めている",
  dropped: "やめた",
  plan_to_watch: "見たい",
  plan_to_read: "読みたい",
};

const entryOf =
  (list: MalList) =>
  ({ node }: MalEntry): SubjectInput => ({
    provider: "myanimelist",
    externalId: `${list}:${node.id}`,
    type: Match.value(list).pipe(
      Match.when("anime", () => "series" as const),
      Match.orElse(() => "book" as const),
    ),
    title: node.title,
    url: `${WEB}/${list}/${node.id}`,
    credits: [],
    tags: [
      ...pipe(
        Option.fromNullishOr(node.genres),
        Option.getOrElse((): readonly MalGenre[] => []),
        Arr.map(({ name }) => name),
      ),
      ...pipe(
        Option.fromNullishOr(node.start_season),
        Option.map(({ year }) => String(year)),
        Option.toArray,
      ),
    ],
  });

const contextOf = (status: Option.Option<string>): Option.Option<string> =>
  pipe(
    status,
    Option.flatMap((value) => Option.fromUndefinedOr(STATUS_LABEL[value])),
  );

export const entryObservationsOf =
  ({ list, fetchedAt }: Readonly<{ list: MalList; fetchedAt: number }>) =>
  (entry: MalEntry): readonly Observation[] => {
    const subject = entryOf(list)(entry);
    const { status, score, updated_at: updatedAt } = entry.list_status;
    const occurredAtMs = epochOr(fetchedAt)(updatedAt);
    return listEntryObservationsOf({
      subject,
      occurredAtMs,
      context: contextOf(Option.fromNullishOr(status)),
      liked: pipe(
        Option.fromNullishOr(score),
        Option.exists((value) => value >= LIKED_SCORE),
      ),
      completed: status === "completed",
    });
  };

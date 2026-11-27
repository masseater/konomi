import { Array as Arr, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { parsedEpoch } from "#/features/ingest-history/api/providers/epoch";
import { listEntriesOf } from "#/features/ingest-history/api/providers/observe";
import {
  orEmpty,
  seriesOrBook,
  subjectIn,
} from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api";
import type { LISTS } from "./api";
import type { MalEntry } from "./schemas";

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
  ({ node }: MalEntry): SubjectInput =>
    subjectIn("myanimelist")({
      externalId: `${list}:${node.id}`,
      type: seriesOrBook(list === "anime"),
      title: node.title,
      url: `${WEB}/${list}/${node.id}`,
      tags: [
        ...pipe(
          orEmpty(node.genres),
          Arr.map(({ name }) => name),
        ),
        ...pipe(
          Option.fromNullishOr(node.start_season),
          Option.map(({ year }) => String(year)),
          Option.toArray,
        ),
      ],
    });

export const entryObservationsOf = ({
  list,
  fetchedAt,
}: Readonly<{ list: MalList; fetchedAt: number }>): ((entry: MalEntry) => readonly Observation[]) =>
  listEntriesOf<MalEntry>({
    subjectOf: entryOf(list),
    occurredAtOf: ({ list_status: { updated_at: updatedAt } }) =>
      parsedEpoch(Option.fromNullishOr(updatedAt)),
    statusOf: ({ list_status: { status } }) => status,
    labels: STATUS_LABEL,
    scoreOf: ({ list_status: { score } }) => score,
    likedFrom: LIKED_SCORE,
    completedStatus: "completed",
  })(fetchedAt);

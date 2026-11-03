import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { PROVIDER_IDS, SIGNAL_KINDS, SUBJECT_TYPES } from "#/shared/config";

const subject = sqliteTable(
  "subject",
  {
    key: text().primaryKey(),
    provider: text({ enum: PROVIDER_IDS }).notNull(),
    type: text({ enum: SUBJECT_TYPES }).notNull(),
    title: text().notNull(),
    url: text().notNull(),
    durationSec: integer(),
    publishedAtMs: integer(),
    vectorId: text(),
  },
  (table) => [
    index("subject_provider_type").on(table.provider, table.type),
    uniqueIndex("subject_vector_id").on(table.vectorId),
  ],
);

const credit = sqliteTable(
  "credit",
  {
    subjectKey: text()
      .notNull()
      .references(() => subject.key, { onDelete: "cascade" }),
    creatorKey: text()
      .notNull()
      .references(() => subject.key, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.subjectKey, table.creatorKey] }),
    index("credit_creator").on(table.creatorKey),
  ],
);

const subjectTag = sqliteTable(
  "subject_tag",
  {
    subjectKey: text()
      .notNull()
      .references(() => subject.key, { onDelete: "cascade" }),
    tag: text().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectKey, table.tag] }),
    index("subject_tag_tag").on(table.tag),
  ],
);

const signal = sqliteTable(
  "signal",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    subjectKey: text()
      .notNull()
      .references(() => subject.key, { onDelete: "cascade" }),
    kind: text({ enum: SIGNAL_KINDS }).notNull(),
    context: text().notNull().default(""),
    occurrence: text().notNull().default(""),
    occurredAtMs: integer().notNull(),
  },
  (table) => [
    uniqueIndex("signal_identity").on(
      table.subjectKey,
      table.kind,
      table.context,
      table.occurrence,
    ),
    index("signal_occurred_at").on(table.occurredAtMs),
  ],
);

export { credit, signal, subject, subjectTag };

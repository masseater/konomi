import { Array as Arr, Duration, Record as Rec, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { tasteOf } from "./taste";
import type { Link, SignalBucket, SubjectInfo, Taste } from "./taste";

const NOW = 1_800_000_000_000;
const LIMIT = 10;
const YESTERDAY = 1;
const daysAgoMs = (days: number): number => NOW - Duration.toMillis(Duration.days(days));

type Play = Readonly<{ key: string; plays: number; daysAgo: number }>;

const video = (key: string): SubjectInfo => ({
  key,
  title: key,
  url: `https://example.com/${key}`,
  type: "video",
});

const person = (key: string): SubjectInfo => ({ ...video(key), type: "person" });

const played = ({ key, plays, daysAgo }: Play): SignalBucket => ({
  subjectKey: key,
  kind: "consumed",
  signals: plays,
  atMs: daysAgoMs(daysAgo),
});

const tasteFrom = (
  input: Readonly<{
    buckets: readonly SignalBucket[];
    subjects: readonly SubjectInfo[];
    credits?: readonly Link[];
    tags?: readonly Link[];
  }>,
): Taste =>
  tasteOf({
    nowMs: NOW,
    credits: [],
    tags: [],
    limit: LIMIT,
    ...input,
  });

const titles = (items: readonly Readonly<{ title: string }>[]): readonly string[] =>
  pipe(
    items,
    Arr.map(({ title }) => title),
  );

describe("tasteOf", () => {
  it("does not let one video played many times outweigh a liked creator's breadth", () => {
    const taste = tasteFrom({
      buckets: [
        played({ key: "loop", plays: 50, daysAgo: 1 }),
        ...pipe(
          ["a1", "a2", "a3"],
          Arr.map((key) => played({ key, plays: 1, daysAgo: 1 })),
        ),
        { subjectKey: "a1", kind: "endorsed", signals: 1, atMs: daysAgoMs(YESTERDAY) },
      ],
      subjects: [...Arr.map(["loop", "a1", "a2", "a3"], video), person("alice"), person("bob")],
      credits: [
        { subjectKey: "loop", target: "bob" },
        ...pipe(
          ["a1", "a2", "a3"],
          Arr.map((subjectKey) => ({ subjectKey, target: "alice" })),
        ),
      ],
    });
    expect(titles(taste.creators.top)).toStrictEqual(["alice", "bob"]);
  });

  it("marks a creator watched only lately as rising and an old favorite as fading", () => {
    const taste = tasteFrom({
      buckets: [
        played({ key: "old", plays: 30, daysAgo: 400 }),
        played({ key: "new", plays: 3, daysAgo: 2 }),
      ],
      subjects: [video("old"), video("new"), person("past"), person("now")],
      credits: [
        { subjectKey: "old", target: "past" },
        { subjectKey: "new", target: "now" },
      ],
    });
    const trends = pipe(
      taste.creators.top,
      Arr.map(({ title, trend }): readonly [string, string] => [title, trend]),
      Rec.fromEntries,
    );
    expect(trends).toStrictEqual({ past: "fading", now: "rising" });
    expect(titles(taste.creators.rising)).toStrictEqual(["now"]);
  });
});

describe("tasteOf facets", () => {
  it("counts a followed creator as a creator, not as a work", () => {
    const taste = tasteFrom({
      buckets: [{ subjectKey: "carol", kind: "followed", signals: 1, atMs: daysAgoMs(YESTERDAY) }],
      subjects: [person("carol")],
    });
    expect(titles(taste.creators.top)).toStrictEqual(["carol"]);
    expect(taste.subjects.top).toStrictEqual([]);
  });

  it("adds tags from the works they are on", () => {
    const taste = tasteFrom({
      buckets: pipe(
        ["x", "y"],
        Arr.map((key) => played({ key, plays: 1, daysAgo: 1 })),
      ),
      subjects: pipe(["x", "y"], Arr.map(video)),
      tags: [
        { subjectKey: "x", target: "VOCALOID" },
        { subjectKey: "y", target: "VOCALOID" },
        { subjectKey: "y", target: "UTAU" },
      ],
    });
    expect(
      pipe(
        taste.tags.top,
        Arr.map(({ tag, lasting }) => ({ tag, lasting })),
      ),
    ).toStrictEqual([
      { tag: "VOCALOID", lasting: 0.667 },
      { tag: "UTAU", lasting: 0.333 },
    ]);
  });
});

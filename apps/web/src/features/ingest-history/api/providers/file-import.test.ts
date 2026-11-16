import { run } from "@r_masseater/workers-tracing/effect";
import { Array as Arr, Effect, Schema, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { fileFormat } from "./file-import.server";

const format = fileFormat({
  id: "sample",
  file: "sample.csv",
  label: "見本の",
  howTo: "",
  fields: [],
  row: Schema.Struct({ Title: Schema.String }),
  observe: ({ rows }) =>
    Effect.succeed(
      pipe(
        rows,
        Arr.map(({ Title }) => ({
          kind: "consumed" as const,
          occurredAtMs: 0,
          subject: {
            provider: "netflix" as const,
            externalId: Title,
            type: "video" as const,
            title: Title,
            url: "",
            credits: [],
            tags: [],
          },
        })),
      ),
    ),
});

describe("fileFormat", () => {
  it("names the file in the label", () => {
    expect(format.label).toBe("見本の sample.csv");
  });

  it("observes rows that have the columns", () => {
    const titles = format
      .observe({ rows: [{ Title: "A" }], fields: {} })
      .pipe(Effect.map(Arr.map(({ subject }) => subject.title)));
    return expect(run(titles)).resolves.toStrictEqual(["A"]);
  });

  it("rejects rows without the columns, naming the file", () => {
    const message = format.observe({ rows: [{ Name: "A" }], fields: {} }).pipe(
      Effect.flip,
      Effect.map(({ message: text }) => text),
    );
    return expect(run(message)).resolves.toBe("sample.csv の列が見つからない。ファイルを確かめる");
  });
});

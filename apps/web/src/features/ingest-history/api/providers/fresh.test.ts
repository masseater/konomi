import { describe, expect, it } from "vite-plus/test";

import { freshOf } from "./fresh";

describe("freshOf", () => {
  it("returns what came before the previous head", () => {
    expect(
      freshOf({ previous: ["c", "d", "e"], current: ["a", "b", "c", "d", "e"] }),
    ).toStrictEqual(["a", "b"]);
  });

  it("counts a replay of an older item as fresh", () => {
    expect(freshOf({ previous: ["c", "d", "e"], current: ["e", "c", "d"] })).toStrictEqual(["e"]);
  });

  it("returns nothing when nothing changed and everything on the first pull", () => {
    expect(freshOf({ previous: ["a", "b"], current: ["a", "b"] })).toStrictEqual([]);
    expect(freshOf({ previous: [], current: ["a", "b"] })).toStrictEqual(["a", "b"]);
  });
});

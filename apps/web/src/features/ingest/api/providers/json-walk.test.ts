import { describe, expect, it } from "vite-plus/test";

import { valuesNamed } from "./json-walk";

describe("valuesNamed", () => {
  it("finds every value under the key in document order", () => {
    const root = {
      list: [{ hit: "first" }, { nested: { hit: "second", deeper: [{ hit: "third" }] } }],
      hit: "root",
    };
    expect(valuesNamed(root, "hit")).toStrictEqual(["root", "first", "second", "third"]);
  });
});

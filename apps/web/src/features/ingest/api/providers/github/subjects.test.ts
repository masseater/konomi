import { describe, expect, it } from "vite-plus/test";

import { repositoryOf } from "./subjects";

const REPO_ID = 1;
const OWNER_ID = 2;

describe("repositoryOf", () => {
  it("credits the owner and tags the language and topics", () => {
    expect(
      repositoryOf({
        starred_at: "2026-01-01T00:00:00Z",
        repo: {
          id: REPO_ID,
          full_name: "someone/tool",
          html_url: "https://github.com/someone/tool",
          language: "TypeScript",
          topics: ["cli"],
          owner: { login: "someone", id: OWNER_ID, html_url: "https://github.com/someone" },
        },
      }),
    ).toStrictEqual({
      provider: "github",
      externalId: "1",
      type: "repository",
      title: "someone/tool",
      url: "https://github.com/someone/tool",
      credits: [
        {
          provider: "github",
          externalId: "2",
          type: "person",
          title: "someone",
          url: "https://github.com/someone",
        },
      ],
      tags: ["TypeScript", "cli"],
    });
  });
});

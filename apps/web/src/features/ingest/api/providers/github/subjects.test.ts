import { describe, expect, it } from "vite-plus/test";

import { starObservationsOf } from "./subjects";

const REPO_ID = 1;
const OWNER_ID = 2;
const FETCHED_AT = 0;

describe("starObservationsOf", () => {
  it("credits the owner and tags the language and topics", () => {
    const observations = starObservationsOf(FETCHED_AT)([
      {
        starred_at: "2026-01-01T00:00:00Z",
        repo: {
          id: REPO_ID,
          full_name: "someone/tool",
          html_url: "https://github.com/someone/tool",
          language: "TypeScript",
          topics: ["cli"],
          owner: { login: "someone", id: OWNER_ID, html_url: "https://github.com/someone" },
        },
      },
    ]);
    expect(observations).toMatchObject([
      {
        subject: {
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
        },
      },
    ]);
  });
});

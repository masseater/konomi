import type { ToolSections } from "@r_masseater/vite-plus-adopt";
import fsd from "@r_masseater/vite-plus-adopt/fsd";
import { Array as Arr, pipe } from "effect";
import type { UserConfig } from "vite-plus";

const MARKDOWN_IGNORES = ["AGENTS.md", ".agents/skills/**", ".claude/worktrees/**", "CHANGELOG.md"];

const markdownFiles = pipe(
  [...MARKDOWN_IGNORES, "README.md"],
  Arr.map((glob) => `':(glob,exclude)${glob}'`),
  Arr.join(" "),
);

const yomiyasuLint = `python3 "$(skills ls --json | jq -r '.[] | select(.name == "yomiyasu").path')/scripts/yomiyasu_lint.py" --strict`;

const PUBLIC_VALUES = [String.raw`\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`];

const checks: ToolSections = {
  commitlint: { extends: ["@commitlint/config-conventional"] },
  betterleaks: {
    extend: { useDefault: true },
    filter: `matchesAny(finding.line, [${pipe(
      PUBLIC_VALUES,
      Arr.map((pattern) => `\`${pattern}\``),
      Arr.join(", "),
    )}])`,
    ignoredSecrets: [
      "32e9a5b40725ab96cffaa77a91697a5c54204a9efd6bf93870d31e7a8a731ebc",
      "d8b076148c939d9d2d6eb60458969c486794a4c0fcf0632be58fa5bf6d15aafa",
    ],
  },
  steiger: {
    paths: ["apps/*/src"],
    rules: [
      ...fsd.configs.recommended,
      {
        rules: {
          "fsd/no-cross-imports": "error",
          "fsd/no-higher-level-imports": "error",
          "fsd/no-wildcard-exports": "error",
        },
      },
    ],
  },
  markdownlint: {
    config: { MD013: { tables: false } },
    ignores: [".claude/skills/**", ".local-agents/**", "AGENTS.md", "CHANGELOG.md"],
  },
  textlint: {
    ignores: MARKDOWN_IGNORES,
    rules: {
      "@textlint-ja/preset-ai-writing": true,
      "preset-ja-technical-writing": {
        "sentence-length": { max: 120 },
        "ja-no-mixed-period": { allowPeriodMarks: [":"] },
        "no-mix-dearu-desumasu": { preferInBody: "である", preferInList: "である" },
        "max-kanji-continuous-len": {
          max: 6,
          allow: [
            "外国電子決済手段",
            "電子決済手段等取引業",
            "前払式支払手段",
            "犯罪収益移転防止法",
            "事業者間取引適正化等法",
            "個人情報保護法",
            "特定商取引法",
            "電気通信利用役務",
            "特定業務委託事業者",
          ],
        },
      },
    },
  },
};

const checkTasks: NonNullable<NonNullable<UserConfig["run"]>["tasks"]> = {
  vpa: { command: "vpa", cache: false },
  yomiyasu: [
    `git ls-files -z '*.md' ${markdownFiles} | xargs -0 -r -n 1 -P 4 ${yomiyasuLint}`,
    `${yomiyasuLint} --doc-type manual README.md`,
  ],
};

export { checkTasks, checks };

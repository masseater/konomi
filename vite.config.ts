import baselineJs from "eslint-plugin-baseline-js";
import { defineConfig } from "vite-plus";

import { checkTasks, checks } from "./checks.config.ts";
import {
  baselineJsRules,
  decisionPluginName,
  decisionRules,
  effectRules,
  eslintReactRules,
  generated,
  htmlReactRules,
  reactHooksRules,
  restrictedImports,
  shadcnRules,
  tanstackQueryRules,
  tanstackRouterRules,
  turnedOff,
} from "./lint.config.ts";
import { workerRules } from "./worker-lint.config.ts";

const typedRules = "@r_masseater/oxlint-typed-rules";

export default defineConfig({
  ...checks,
  test: { projects: ["apps/*", "libs/*", "tools/*", "infra/*"], passWithNoTests: true },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: generated,
    sortImports: true,
    sortTailwindcss: true,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: generated,
    plugins: [
      "eslint",
      "typescript",
      "unicorn",
      "oxc",
      "import",
      "react",
      "react-perf",
      "jsx-a11y",
      "jsdoc",
      "promise",
      "node",
      "effecttsgo",
    ],
    categories: {
      correctness: "error",
      suspicious: "error",
      pedantic: "error",
      perf: "error",
      style: "error",
      restriction: "error",
      nursery: "error",
    },
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "tanstack-query", specifier: `${typedRules}/tanstack-query` },
      { name: "tanstack-router", specifier: `${typedRules}/tanstack-router` },
      { name: "tanstack-start", specifier: `${typedRules}/tanstack-start` },
      { name: "drizzle", specifier: `${typedRules}/drizzle` },
      { name: "react-hooks-js", specifier: "eslint-plugin-react-hooks" },
      { name: "@eslint-react", specifier: `${typedRules}/react` },
      { name: "shadcn", specifier: "@shadcn/lint" },
      { name: "no-comments", specifier: "eslint-plugin-no-comments" },
      { name: "baseline-js", specifier: "eslint-plugin-baseline-js" },
      { name: "@html-eslint/react", specifier: "@html-eslint/eslint-plugin-react" },
      { name: decisionPluginName, specifier: "./decision-rules.ts" },
      { name: "eslint-js", specifier: "oxlint-plugin-eslint" },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "tanstack-start/no-async-client-component": "error",
      "tanstack-start/no-client-code-in-server-component": "error",
      "no-comments/disallowComments": ["error", { allow: ["oxlint-disable", "eslint-disable"] }],
      ...tanstackQueryRules,
      ...tanstackRouterRules,
      "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db"] }],
      "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db"] }],
      ...shadcnRules,
      ...baselineJsRules,
      ...baselineJs.configs.recommended().rules,
      ...htmlReactRules,
      ...reactHooksRules,
      ...eslintReactRules,
      ...effectRules,
      "eslint/sort-imports": "off",
      "eslint/sort-keys": "off",
      "import/no-named-export": "off",
      "import/prefer-default-export": "off",
      "react/react-in-jsx-scope": "off",
      "eslint/no-undef": "off",
      "typescript/promise-function-async": "off",
      "react/forbid-component-props": "off",
      "oxc/no-rest-spread-properties": "off",
      "node/no-top-level-await": "off",
      "eslint/one-var": ["error", "never"],
      "eslint/no-restricted-imports": ["error", restrictedImports],
      "typescript/prefer-readonly-parameter-types": [
        "error",
        {
          ignoreInferredTypes: true,
          allow: [
            { from: "lib", name: "Request" },
            { from: "lib", name: "Response" },
            { from: "package", package: "@tanstack/query-core", name: "QueryClient" },
            { from: "package", package: "@modelcontextprotocol/server", name: "McpServer" },
            {
              from: "package",
              package: "react",
              name: ["ReactNode", "ButtonHTMLAttributes", "ClassAttributes"],
            },
            { from: "package", package: "clsx", name: "ClassValue" },
            {
              from: "package",
              package: "effect",
              name: [
                "Cause",
                "Context",
                "Decoder",
                "Effect",
                "Exit",
                "HttpClientRequest",
                "HttpClientResponse",
                "Layer",
                "Option",
              ],
            },
          ],
        },
      ],
      "eslint/no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
      "react/function-component-definition": [
        "error",
        { namedComponents: "arrow-function", unnamedComponents: "arrow-function" },
      ],
      "eslint/new-cap": [
        "error",
        {
          capIsNewExceptions: ["App", "CloudflareApiLive", "Secret", "Stack"],
          capIsNewExceptionPattern: String.raw`^(Config|Context|Data|Schema|AnalyticsEngine|ApiToken|D1|Logpush|R2|Ruleset|Rules|Vectorize|Website|Workers|Zone)\.`,
        },
      ],
      "typescript/no-empty-interface": ["error", { allowSingleExtends: true }],
      "typescript/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
      "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
      "react/only-export-components": ["error", { allowExportNames: ["Route"] }],
    },
    overrides: [
      {
        files: ["**/*.config.ts", "**/alchemy.run.ts", "**/*.worker.ts", "decision-rules.ts"],
        rules: { "import/no-default-export": "off" },
      },
      {
        files: ["**/alchemy.*.ts"],
        rules: {
          "eslint-js/no-restricted-syntax": [
            "error",
            {
              selector:
                'CallExpression[callee.name="Stack"]:not([arguments.0.name="APP_NAME"]):not([arguments.0.type="TemplateLiteral"][arguments.0.quasis.0.value.raw=""][arguments.0.expressions.0.name="PREFIX"])',
              message:
                "スタック名には app-name.ts の APP_NAME か、PREFIX で始まるテンプレートリテラルを渡す",
            },
            {
              selector:
                'Program:not(:has(YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
              message:
                "スタックの最後で app-name.ts の requireAppPrefix を yield* して、リソース名の prefix を検査する",
            },
            {
              selector:
                'CallExpression[callee.name="Stack"] > .arguments:nth-child(3):not(:has(FunctionExpression > BlockStatement > ExpressionStatement:nth-last-child(2) > YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
              message:
                "スタックの最後で app-name.ts の requireAppPrefix を yield* して、リソース名の prefix を検査する",
            },
          ],
        },
      },
      {
        files: ["**/shared/ui/**"],
        rules: { "shadcn/no-restyle": "off", "react/jsx-props-no-spreading": "off" },
      },
      {
        files: ["apps/web/src/**/*.{ts,tsx}"],
        rules: { ...decisionRules, ...workerRules },
      },
      {
        files: ["**/*.test.ts"],
        rules: turnedOff(decisionRules),
      },
    ],
    settings: {
      [decisionPluginName]: { model: "openrouter/typesafe/jev-1.14" },
    },
    options: {
      typeAware: true,
      typeCheck: true,
      denyWarnings: true,
      reportUnusedDisableDirectives: "error",
    },
  },
  run: {
    cache: true,
    tasks: {
      ...checkTasks,
      renovate: "renovate-config-validator --strict",
      fallow: [
        "fallow --skip dupes --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --quiet --format json | jq -e '[.prop_drilling_chains, .thin_wrappers, .duplicate_prop_shapes] | all(length == 0)' > /dev/null",
        "fallow dupes --fail-on-issues --quiet --format compact",
        "fallow security --fail-on-issues --quiet",
      ],
      "actions-lint":
        "ast-grep scan --rule .github/rules/no-full-history-checkout.yml .github/workflows",
      verify: {
        command: "vp check",
        cache: {
          env: ["OPENROUTER_API_KEY"],
          untrackedEnv: [
            "CLAUDECODE",
            "CLAUDE_CODE_REMOTE",
            "HTTPS_PROXY",
            "https_proxy",
            "NO_PROXY",
            "no_proxy",
            "SSL_CERT_FILE",
            "NODE_EXTRA_CA_CERTS",
          ],
        },
        dependsOn: [
          "test",
          "syncpack",
          "vpa",
          "yomiyasu",
          "renovate",
          "actions-lint",
          "db-check-all",
          "fallow",
          "audit",
        ],
      },
      test: "vp test run",
      syncpack: "syncpack lint",
      "db-check-all": "vp run -r db:check",
      audit: {
        command:
          'before="$(cksum pnpm-workspace.yaml)"; vp pm audit --fix || exit; if [ "$before" != "$(cksum pnpm-workspace.yaml)" ]; then echo "vp pm audit --fix rewrote pnpm-workspace.yaml. Run vp install and commit the diff." >&2; exit 1; fi',
        cache: false,
      },
    },
  },
});

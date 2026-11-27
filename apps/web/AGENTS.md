# web

The konomi site and MCP server, deployed to Cloudflare Workers with Alchemy and storing records in D1.

- To run one test, run `vp test run <file>` in this directory.
- Write D1 schemas in `*.table.ts` files and run `vp run db:generate` to create the migration.
- Generate the Better Auth tables with `vp run auth:generate`. It writes `src/shared/db/generated/auth.table.ts`.
- Changing `APP_NAME` in `alchemy.app-name.ts` recreates the resources.

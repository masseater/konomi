# konomi

An MCP server that lets a personal agent know the owner's tastes. It collects the owner's watch, listen, read and play history, and their likes, saves and follows, from many services into the owner's own Cloudflare account. Read `repo-conventions` and `vite-plus`, skills in masseater/skills that `vp install` puts in `.agents/skills/`, before starting work.

## Tech stack

The base stack is TypeScript 7, Effect, Alchemy and Cloudflare.

## Commands

- `vp run verify` runs every check in this repository. The pre-push hook runs the same checks.
- To run one test, run `vp test run <file>` in that workspace's directory.

## Rules

- Each workspace has its own AGENTS.md describing it and the rules that apply only there. Read it before changing that workspace.
- Build every check of the repository, such as lint rules and convention checks, into msch. Do not create checks anywhere else.
- Only the owner can sign in. Do not add a way to let others sign in.

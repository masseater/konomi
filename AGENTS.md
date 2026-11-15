作業を始める前に `repo-conventions` と `vite-plus` の skill を読み、従う。どちらも masseater/skills にあり、`vp install` が `.agents/skills/` に入れる。

## コマンド

- テストを 1 つだけ走らせるときは、`apps/web` で `vp test run <ファイル>` を実行する。
- D1 のスキーマは `*.table.ts` に書き、`apps/web` で `vp run db:generate` を実行してマイグレーションを作る。better-auth のテーブルは `vp run auth:generate` で生成する。

## 構成

- `apps/web` は TanStack Start のアプリである。`apps/web/app-name.ts` の `APP_NAME` を変えるとリソースは作り直される。
- `apps/lp` は静的な LP の見本で、`apps/web` のスタックが `Website.StaticSite` でデプロイする。

# web

## コマンド

- テストを 1 つだけ走らせるときは、このディレクトリで
  `vp test run <ファイル>` を実行する。
- D1 のスキーマは `*.table.ts` に書き、`vp run db:generate` を実行して
  マイグレーションを作る。
- better-auth のテーブルは `vp run auth:generate` で生成する。

## 構成

- `app-name.ts` の `APP_NAME` を変えるとリソースは作り直される。
- `apps/lp` は静的な LP の見本で、このスタックが `Website.StaticSite` で
  デプロイする。

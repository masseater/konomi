# konomi

見た動画・聴いた曲・高評価・マイリスト・フォローを、サービスをまたいで自分の Cloudflare に集め、AI が MCP で読めるようにする。
コーディング向けではなく、自分の好みを知ってほしいパーソナルエージェント向けの MCP サーバーである。

ホスティングしたサービスとしては出さない。各自が自分の Cloudflare アカウントにデプロイして、自分の記録だけを入れて使う。

## 公開先

- masseater のインスタンス: <https://konomi.masseater.dev>（MCP は <https://konomi.masseater.dev/mcp>。持ち主だけがログインできる）

## MCP のツール

`search_activity` は、語・サービス・種類（見た・高評価・保存・フォロー）・期間で記録を引く。
`taste_summary` は、投稿者ごとの件数と、サービスと種類ごとの件数をまとめる。

## 取り込めるサービス

今はニコニコ動画の視聴履歴・いいね・マイリスト・フォローを取り込む。
ログイン Cookie の `user_session` で、Web 版が使う nvapi を読む。
Spotify と YouTube を次に足す。公式 API で取れるものは公式 API で読み、取れないものだけを非公開の API で補う。

## 非公開 API を使う危険

ニコニコ動画のように公式の個人データ API が無いサービスは、ブラウザのログイン Cookie を預かり、Web 版が内部で使う API を読む。

これには 3 つの危険がある。
利用規約に反するとみなされ、アカウントを止められることがある。
API の形は予告なく変わり、変わると取り込みが「取り込みに失敗した」になって、直すまで止まる。
Cookie はそれだけでそのアカウントにログインできる鍵である。
konomi は `CREDENTIAL_KEY` から導いた鍵で暗号化して D1 に置くが、
Cloudflare アカウントを乗っ取られれば読まれる。

konomi は 1 時間に 1 回、新しい分だけを読む。初回だけ 10 ページまで遡る。
アクセスの量を増やす変更はしないでほしい。

## 自分のアカウントに置く

前提は [Vite+](https://viteplus.dev/guide/) の `vp`、
Workers Paid プランの Cloudflare アカウント、Cloudflare に置いたドメインである。

1. このリポジトリを fork し、`apps/web/app-name.ts` の `APP_NAME` と
   `apps/web/alchemy.run.ts` の `DEFAULT_DOMAIN` を自分のものに変える。
   手元からデプロイするときは、`KONOMI_DOMAIN` を渡しても変えられる
2. `vp install` のあと、次のコマンドで Cloudflare の認証情報を入れる。
   `vp exec --filter web alchemy profile edit --add Cloudflare`
   そのあと `apps/web` で `vp run deploy` を実行する
3. デプロイしたサイトを開き、持ち主のアカウントを作る。アカウントを作れるのは最初の 1 人だけである
4. サービスのログイン情報を貼る。サイトの各サービスの欄に、どこから取るかが書いてある
5. MCP クライアント（claude.ai のコネクタなど）に `https://<ドメイン>/mcp` を登録し、OAuth でログインする

## 開発

`vp run verify` が検査をまとめて流す。作業の決まりは CLAUDE.md と AGENTS.md にある。
masseater/typescript-template から作ったので、テンプレートの更新を取り込める。

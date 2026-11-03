# konomi

見た動画・聴いた曲・高評価・マイリスト・フォローを、サービスをまたいで自分の Cloudflare に集め、AI が MCP で読めるようにする。
コーディング向けではなく、自分の好みを知ってほしいパーソナルエージェント向けの MCP サーバーである。

ホスティングしたサービスとしては出さない。各自が自分の Cloudflare アカウントにデプロイして、自分の記録だけを入れて使う。

## 公開先

- masseater のインスタンス: <https://konomi.masseater.dev>（MCP は <https://konomi.masseater.dev/mcp>。持ち主だけがログインできる）

## MCP のツール

`search_signals` は、見た・聴いた・高評価・保存・フォローの記録を、サービスをまたいで語・種類・期間で引く。
`taste_profile` は、作品・投稿者やアーティスト・タグごとの好みの度合いを、長く続く好みと最近の好みに分けて返す。
計算の仕方は [docs/design.md](docs/design.md) にある。
`find_similar` は、文か記録の対象から、意味の近いものを記録の中から探す。
`read_taste_note` と `write_taste_note` は、AI が書いた好みのメモを読み書きする。
メモの文にはそれぞれ根拠の記録が付く。
`list_connections` は、サービスごとの取り込みの状態を返す。ログインが切れていれば、AI が持ち主に伝えられる。
記録の形とプロバイダーの境目は [docs/design.md](docs/design.md) にある。

## 取り込めるサービス

今はニコニコ動画の視聴履歴・いいね・マイリスト・フォローを取り込む。
Web 版が内部で使う nvapi を、ログインした状態で読む。
ログインは 2 通りから選べる。
メールアドレスとパスワードを預けると、ログインが切れるたびに konomi がログインし直す。
二段階認証を認証アプリで使っているなら、そのシークレットも預ける。
預けたくなければ `user_session` の Cookie を貼る。この場合は切れるたびに貼り直す。

Spotify と YouTube を次に足す。公式 API で取れるものは公式 API で読み、取れないものだけを非公開の API で補う。

## 非公開 API を使う危険

ニコニコ動画のように公式の個人データ API が無いサービスは、ブラウザのログイン Cookie を預かり、Web 版が内部で使う API を読む。

これには 3 つの危険がある。
利用規約に反するとみなされ、アカウントを止められることがある。
API の形は予告なく変わり、変わると取り込みが「取り込みに失敗した」になって、直すまで止まる。
預けたパスワードや Cookie は、それだけでそのアカウントにログインできる鍵である。
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

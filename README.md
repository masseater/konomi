# konomi

見た動画・聴いた曲・高評価・マイリスト・フォローを、サービスをまたいで自分の Cloudflare に集め、AI が MCP で読めるようにする。
コーディング向けではなく、自分の好みを知ってほしいパーソナルエージェント向けの MCP サーバーである。

ホスティングしたサービスとしては出さない。各自が自分の Cloudflare アカウントにデプロイして、自分の記録だけを入れて使う。

## 公開先

- masseater のインスタンス: <https://konomi.masseater.dev>（MCP は <https://konomi.masseater.dev/mcp>。持ち主だけがログインできる）

## MCP のツール

- `search_signals`: 見た・聴いた・高評価・保存・フォローの記録を、サービスをまたいで語・種類・期間で引く
- `taste_profile`: 作品・投稿者やアーティスト・タグごとの好みの度合いを、長く続く好みと最近の好みに分けて返す
- `find_similar`: 文か記録の対象から、意味の近いものを記録の中から探す
- `read_taste_note`・`write_taste_note`: AI が書いた好みのメモを読み書きする。メモの文にはそれぞれ根拠の記録が付く
- `list_connections`: サービスごとの取り込みの状態を返す。ログインが切れていれば、AI が持ち主に伝えられる

好みの度合いの計算の仕方、記録の形、プロバイダーの境目は [docs/design.md](docs/design.md) にある。

## 取り込めるサービス

ニコニコ動画は、視聴履歴・いいね・マイリスト・フォローを、Web 版が内部で使う nvapi で読む。
YouTube は、高評価・登録チャンネル・自分の再生リストを YouTube Data API v3 で読む。
視聴履歴は Data API に無いので、Cookie を入れたときだけ Web 版の InnerTube で読む。
Spotify は、最近聴いた曲・保存した曲・フォローしたアーティスト・自分のプレイリストを
Spotify Web API で読む。
SoundCloud は、再生履歴・いいねした曲とプレイリスト・フォローを、
Web 版が内部で使う api-v2 で読む。
Apple Music は、最近聴いた曲とライブラリの曲を Apple Music API で読む。
Last.fm は、scrobble の記録と Loved Tracks を、ユーザー名と API キーで読む。
Steam は、持っているゲームと最後に遊んだ日時を、Steam ID と Web API キーで読む。
Bluesky は、いいねした投稿とフォローを、ハンドルとアプリパスワードで読む。
Annict は、視聴記録と見てる・見たのアニメを、個人用アクセストークンで読む。
Twitch は、フォローしたチャンネルを Helix API で読む。
GitHub は、スターを付けたリポジトリとフォローを、ユーザー名で読む。
AniList は、アニメとマンガのリストと点数を、ユーザー名で読む。
MyAnimeList は、アニメとマンガのリストと点数を、ユーザー名と Client ID で読む。
Trakt は、映画とドラマの視聴履歴と評価を、ユーザー名と Client ID で読む。
VocaDB は、評価した曲を、ユーザー名で読む。
Mastodon は、お気に入り・ブックマーク・フォローを、サーバーの URL とアクセストークンで読む。
Misskey は、お気に入り・リアクション・フォローを、サーバーの URL とアクセストークンで読む。
Reddit は、upvote した投稿と保存した投稿を Reddit API で読む。
Raindrop.io は、保存したブックマークを、テストトークンで読む。
Pinterest は、自分のピンを Pinterest API v5 で読む。
X は、いいねとブックマークを、[twilog](https://twilog.togetter.com/) の公式 MCP から読む。
twilog に X のアカウントを登録しておき、何も入れずに保存してから「許可する」を押す。
はてなブックマークは、公開しているブックマークとコメントを、はてな ID で RSS から読む。
Letterboxd は、日記に付けた視聴記録・評価・いいねを、ユーザー名で RSS から読む。
Filmarks は、映画とドラマの Mark と Clip を、ユーザー ID で公開ページから読む。
PlayStation は、遊んだゲームと最初と最後に遊んだ日時を、NPSSO で読む。
ListenBrainz は、聴いた曲とハートを付けた曲を、ユーザー名で読む。
Open Library は、読んだ・読んでいる・読みたい本を、ユーザー名で読む。
Qiita は、ストックした記事を、ユーザー名で読む。

OAuth で許可するサービスは、Client ID と Client Secret を保存してから、画面の「許可する」から許可の画面へ進む。
アプリの設定には、画面に出るリダイレクト URI を登録しておく。

- YouTube は、Google Cloud で YouTube Data API v3 を有効にし、種類が「ウェブ アプリケーション」の OAuth クライアントを作る。
  同意画面の公開ステータスが「テスト」のままだと、許可は 7 日で切れる。「本番環境」にしておく
- Spotify は、[開発者のダッシュボード](https://developer.spotify.com/dashboard)で Web API のアプリを作る。
  開発モードのアプリは、持ち主が Premium でないと使えない
- Apple Music は、Apple Developer Program の Certificates, Identifiers & Profiles で
  Media Services の鍵を作る。
  鍵を保存したら `/connect/apple-music` の画面で Apple ID の許可を取る。許可はおよそ 6 か月で切れる
- Twitch は、[開発者のコンソール](https://dev.twitch.tv/console)で、
  種類が Confidential のアプリを作る
- Reddit は、[アプリの設定](https://www.reddit.com/prefs/apps)で種類が web app のアプリを作る
- Pinterest は、[開発者のアプリ](https://developers.pinterest.com/apps/)でアプリを作る。
  試用のアクセスのままだと、読めるのは自分のピンだけである

ニコニコ動画はメールアドレスとパスワードを預けると、ログインが切れるたびに konomi がログインし直す。
預けたくなければ `user_session` の Cookie を貼る。この場合は切れるたびに貼り直す。
SoundCloud の `client_id` は、soundcloud.com のスクリプトから konomi が自分で取り直す。

## 非公開 API を使う危険

ニコニコ動画・SoundCloud・PlayStation と YouTube の視聴履歴は、公式に読む手段が無い。
ブラウザのログイン Cookie を預かり、Web 版やアプリが内部で使う API を読む。
YouTube の視聴履歴は、Cookie を入れたときだけ読む。

これには 3 つの危険がある。
利用規約に反するとみなされ、アカウントを止められることがある。
API の形は予告なく変わり、変わると取り込みが「取り込みに失敗した」になって、直すまで止まる。
預けたパスワードや Cookie は、それだけでそのアカウントにログインできる鍵である。
konomi は `CREDENTIAL_KEY` から導いた鍵で暗号化して D1 に置くが、
Cloudflare アカウントを乗っ取られれば読まれる。

YouTube の Cookie は、ブラウザで使い続けると回されて切れることがある。
シークレットウィンドウでログインして Cookie を取り、そのウィンドウを閉じておくと長持ちする。

konomi は 1 時間に 1 回、新しい分だけを読む。初回だけ遡って読む。
再生リストとライブラリの全体は 1 日 1 回だけ読む。
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

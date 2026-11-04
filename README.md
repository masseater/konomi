# konomi

見た動画や聴いた曲、読んだ本や遊んだゲーム、付けた高評価やフォローを、30 余りのサービスから自分の Cloudflare に集める。
集めた記録は、AI が MCP で読める。
パーソナルエージェントに自分の好みを知ってもらうための MCP サーバーである。

ホスティングしたサービスとしては出していない。
各自が自分の Cloudflare アカウントにデプロイし、自分の記録だけを入れて使う。

## 公開先

masseater のインスタンスは <https://konomi.masseater.dev> にあり、
MCP は <https://konomi.masseater.dev/mcp> である。
ログインできるのは持ち主だけである。

## AI ができること

- `search_signals`: 見た・聴いた・高評価・保存・フォローの記録を、サービスをまたいで語・種類・期間で探す
- `taste_profile`: 作品・作者・タグごとの好みの度合いを、長く続く好みと最近の好みに分けて返す
- `find_similar`: 文や記録に意味の近いものを、記録の中から探す
- `read_taste_note`・`write_taste_note`: AI が根拠の記録を付けて書いた好みのメモを読み書きする
- `list_connections`: サービスごとの取り込みの状態を返す。ログインが切れていれば、AI が持ち主に伝える

好みの度合いの計算の仕方は [docs/design.md](docs/design.md) にある。

## 取り込めるサービス

### 公式の API と公開データで読む

動画は YouTube と Twitch を読む。
映画とアニメは Trakt、Letterboxd、Filmarks、Annict、AniList、MyAnimeList を読む。
音楽は Spotify、Apple Music、Last.fm、ListenBrainz、VocaDB を読む。
ゲームは Steam と、OpenXBL を経由して Xbox を読む。
本は Open Library、イラストは Pinterest を読む。
SNS は Bluesky、Mastodon、Misskey、Reddit と、twilog の MCP を経由して X を読む。
ブックマークは、はてなブックマーク、Raindrop.io、GitHub のスター、Qiita のストックを読む。

### 非公式の API で読む

ニコニコ動画、YouTube の視聴履歴、SoundCloud、PlayStation、VRChat、pixiv を読む。
危険は[次の節](#非公式の-api-を使う危険)にある。

### 書き出しファイルを取り込む

Netflix、Prime Video、Kindle は、サービスが書き出した CSV をサイトから取り込む。

ログイン情報の取り方と、書き出しファイルの頼み方は、サイトの各サービスの欄に書いてある。

### 取り込みの頻度

API で読むサービスは、初回に過去へ遡り、あとは 1 時間ごとに新しい分を読む。
書き出しファイルは自動では読み直さないので、新しい分は書き出し直して取り込む。同じ記録は二重にならない。

## 非公式の API を使う危険

非公式の API で読むサービスでは、ブラウザのログイン Cookie やパスワードを預かり、Web 版やアプリが内部で使う API を読む。
利用規約に反するとみなされ、アカウントを止められることがある。
API の形が予告なく変わると、直すまで取り込みが止まる。
預けた Cookie やパスワードは、それだけでアカウントにログインできる鍵である。
konomi は暗号化して D1 に置くが、Cloudflare アカウントを乗っ取られれば読まれる。

YouTube の Cookie は、シークレットウィンドウでログインして取り、そのウィンドウを閉じておくと長く切れない。

fork して使うときも、読む間隔を縮めるような、アクセスの量を増やす変更はしないでほしい。

## 自分の Cloudflare に置く

前提は [Vite+](https://viteplus.dev/guide/) の `vp`、Workers Paid プランの Cloudflare アカウント、
Cloudflare に置いたドメインである。

### 名前とドメインを変える

このリポジトリを fork し、`apps/web/app-name.ts` の `APP_NAME` と
`apps/web/alchemy.run.ts` の `DEFAULT_DOMAIN` を自分のものに変える。

### デプロイする

```sh
vp install
vp exec --filter web alchemy profile edit --add Cloudflare
cd apps/web && vp run deploy
```

### 持ち主のアカウントを作る

デプロイしたサイトを開いてアカウントを作る。アカウントを作れるのは最初の 1 人だけである。
そのあと各サービスの欄で、ログイン情報を入れるか書き出しファイルを取り込む。

### AI につなぐ

MCP クライアント（claude.ai のコネクタなど）に `https://<ドメイン>/mcp` を登録し、OAuth でログインする。

## 開発する

`vp run verify` が検査をまとめて流す。
masseater/typescript-template から作ったので、テンプレートの更新を取り込める。

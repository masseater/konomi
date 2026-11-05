# konomi

見た動画や聴いた曲、読んだ本や遊んだゲーム、付けた高評価やフォローを各サービスから自分の Cloudflare に集める。
集めた記録は AI が MCP で読む。
パーソナルエージェントに自分の好みを知ってもらうための MCP サーバーである。

ホスティングは提供していない。
各自が自分の Cloudflare アカウントにデプロイし、自分の記録だけを入れて使う。
masseater のインスタンスは <https://konomi.masseater.dev> で動いており、
MCP の URL は <https://konomi.masseater.dev/mcp> になる。ログインできるのは持ち主だけだ。

## AI に頼めること

- 見た・聴いた・高評価・保存・フォローの記録を、サービスをまたいで語と種類と期間で探す
- 作品・作者・タグごとの好みの強さを、長く続く好みと最近の好みに分けて知る
- 文や記録と意味の近いものを、記録の中から探す
- 根拠の記録を付けた好みのメモを書き残し、次の会話で読み返す
- 取り込みが止まったサービスを見つけ、持ち主にログインし直すよう伝える

## 取り込めるサービス

- 動画は YouTube・Twitch・ニコニコ動画・Netflix・Prime Video
- 映画とアニメは Trakt・Letterboxd・Filmarks・Annict・AniList・MyAnimeList
- 音楽は Spotify・Apple Music・Last.fm・ListenBrainz・VocaDB・SoundCloud
- ゲームは Steam・Xbox・PlayStation・VRChat
- 本は Open Library・Kindle
- イラストは Pinterest・pixiv
- SNS は Bluesky・Mastodon・Misskey・Reddit・X
- ブックマークは はてなブックマーク・Raindrop.io・GitHub のスター・Qiita のストック

X は twilog の MCP を、Xbox は OpenXBL を経由して読む。

### 公式の API と公開データで読むサービス

つないだときに過去へ遡り、そのあとは 1 時間ごとに新しい分を読む。

### 非公式の API で読むサービス

ニコニコ動画・YouTube の視聴履歴・SoundCloud・PlayStation・VRChat・pixiv が当たる。
1 時間ごとに読むのは同じだが、[非公式の API の危険](#非公式の-api-の危険)を承知のうえでつなぐ。

### 書き出しファイルを取り込むサービス

Netflix・Prime Video・Kindle には API が無く、サービスが書き出した CSV をサイトから取り込む。
自動では読み直さないので、新しい分は書き出し直して取り込む。
同じ記録を何度取り込んでも二重にはならない。

## 非公式の API の危険

非公式の API で読むサービスには、ブラウザのログイン Cookie やパスワードを預ける。
konomi はそれを使い、Web 版やアプリが内部で呼ぶ API を読む。
利用規約に反するとみなされれば、アカウントを止められることがある。
API の形が予告なく変わると、konomi を直すまで取り込みは止まる。

預けた Cookie やパスワードは、それだけでアカウントにログインできる鍵である。
konomi は暗号化して D1 に置くが、Cloudflare アカウントを乗っ取られれば読まれてしまう。

YouTube の Cookie は、シークレットウィンドウでログインして取る。
そのウィンドウを閉じておけば長く切れない。

fork して使うときも、読む間隔を縮めるなどしてアクセスの量を増やさないでほしい。

## 自分の Cloudflare に置く

前提として [Vite+](https://viteplus.dev/guide/) の `vp` と、
Workers Paid プランの Cloudflare アカウントと、そのアカウントに置いたドメインが要る。

### デプロイする

このリポジトリを fork して clone し、ドメインを指定してデプロイする。

```sh
vp install
vp exec --filter web alchemy profile edit --add Cloudflare
cd apps/web && KONOMI_DOMAIN=<ドメイン> vp run deploy
```

### 持ち主のアカウントを作る

デプロイしたサイトを開いてアカウントを作る。アカウントを作れるのは最初の 1 人だけである。
続けて各サービスの欄を開き、そこに書かれた手順でログイン情報を入れるか、書き出しファイルを取り込む。

### AI につなぐ

MCP クライアントに `https://<ドメイン>/mcp` を登録し、OAuth でログインする。
claude.ai ならコネクタとして登録する。

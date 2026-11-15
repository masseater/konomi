# konomi

自分の好みをパーソナルエージェントに知ってもらうための MCP サーバー。

konomi は、見た・聴いた・読んだ・遊んだ記録と、付けた高評価・保存・フォローを、各サービスから自分の Cloudflare アカウントに集める。
AI が MCP 経由で集めた記録を読み取る。
ホスト版は存在しない。
各自が自身の Cloudflare アカウントにこれをデプロイし、自身の記録のみをそこに格納する。

## 公開先

サイトは <https://konomi.masseater.dev> で、
MCP サーバーは <https://konomi.masseater.dev/mcp> にある。
ログインできるのは持ち主の masseater だけだ。

## AI に頼めること

AI は、語、種類、期間を指定して、サービスを横断して履歴、高評価、保存、フォローを検索できる。
各作品や作者、タグをどの程度好んでいるかを判別し、長く続いている好みと最近のものを分けて知ることができる。
また、ある文や他の記録と意味が近い記録を見つけ出すこともできる。

根拠の記録を付けて好みのメモを書き、次の会話でそれを読み返すことができる。
サービスの取り込みが止まると、そのサービスを特定し、持ち主に再度ログインするよう求める。

## 取り込めるサービス

| サービス                                           | ジャンル     | 取り方                                            | 渡すもの                                       | 取れる記録                   |
| -------------------------------------------------- | ------------ | ------------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| [YouTube](https://www.youtube.com)                 | 動画         | 公式 API。視聴履歴だけ非公式 API                  | Google Cloud のアプリで許可。視聴履歴は Cookie | 履歴・高評価・保存・フォロー |
| [Twitch](https://www.twitch.tv)                    | 動画         | 公式 API                                          | Twitch のアプリで許可                          | フォロー                     |
| [ニコニコ動画](https://www.nicovideo.jp)           | 動画         | 非公式 API                                        | ログイン情報か Cookie                          | 履歴・高評価・保存・フォロー |
| [Netflix](https://www.netflix.com)                 | 動画         | 書き出しファイル                                  | 視聴履歴の CSV                                 | 履歴                         |
| [Prime Video](https://www.amazon.co.jp/primevideo) | 動画         | 書き出しファイル                                  | 視聴履歴の CSV                                 | 履歴                         |
| [Trakt](https://trakt.tv)                          | 映画とアニメ | 公式 API                                          | Client ID とユーザー名                         | 履歴・高評価                 |
| [Letterboxd](https://letterboxd.com)               | 映画とアニメ | 公開データ                                        | ユーザー名                                     | 履歴・高評価                 |
| [Filmarks](https://filmarks.com)                   | 映画とアニメ | 公開データ                                        | ユーザー ID                                    | 高評価・保存                 |
| [Annict](https://annict.com)                       | 映画とアニメ | 公式 API                                          | アクセストークン                               | 履歴・高評価・保存           |
| [AniList](https://anilist.co)                      | 映画とアニメ | 公式 API                                          | ユーザー名                                     | 履歴・高評価・保存           |
| [MyAnimeList](https://myanimelist.net)             | 映画とアニメ | 公式 API                                          | Client ID とユーザー名                         | 履歴・高評価・保存           |
| [Spotify](https://www.spotify.com)                 | 音楽         | 公式 API                                          | Spotify のアプリで許可                         | 履歴・高評価・保存・フォロー |
| [Apple Music](https://music.apple.com)             | 音楽         | 公式 API                                          | MusicKit の鍵で許可                            | 履歴・保存                   |
| [Last.fm](https://www.last.fm)                     | 音楽         | 公式 API                                          | ユーザー名と API キー                          | 履歴・高評価                 |
| [ListenBrainz](https://listenbrainz.org)           | 音楽         | 公式 API                                          | ユーザー名                                     | 履歴・高評価                 |
| [VocaDB](https://vocadb.net)                       | 音楽         | 公式 API                                          | ユーザー名                                     | 高評価                       |
| [SoundCloud](https://soundcloud.com)               | 音楽         | 非公式 API                                        | ログイン中の oauth_token                       | 履歴・高評価・フォロー       |
| [Steam](https://store.steampowered.com)            | ゲーム       | 公式 API                                          | Web API キーと SteamID                         | 履歴・保存                   |
| [Xbox](https://www.xbox.com)                       | ゲーム       | [OpenXBL](https://xbl.io) 経由                    | OpenXBL の API キー                            | 履歴・フォロー               |
| [PlayStation](https://www.playstation.com)         | ゲーム       | 非公式 API                                        | NPSSO                                          | 履歴・保存                   |
| [VRChat](https://vrchat.com)                       | ゲーム       | 非公式 API                                        | auth の Cookie                                 | 保存・フォロー               |
| [Open Library](https://openlibrary.org)            | 本           | 公式 API                                          | ユーザー名                                     | 履歴・保存                   |
| [Kindle](https://www.amazon.co.jp/kindle)          | 本           | 書き出しファイル                                  | 持っている本と読書の記録の CSV                 | 履歴・保存                   |
| [Pinterest](https://www.pinterest.com)             | イラスト     | 公式 API                                          | Pinterest のアプリで許可                       | 保存                         |
| [pixiv](https://www.pixiv.net)                     | イラスト     | 非公式 API                                        | refresh token                                  | 保存・フォロー               |
| [Bluesky](https://bsky.app)                        | SNS          | 公式 API                                          | ハンドルとアプリパスワード                     | 高評価・フォロー             |
| [Mastodon](https://joinmastodon.org)               | SNS          | 公式 API                                          | サーバーの URL とアクセストークン              | 高評価・保存・フォロー       |
| [Misskey](https://misskey-hub.net)                 | SNS          | 公式 API                                          | サーバーの URL とアクセストークン              | 高評価・保存・フォロー       |
| [Reddit](https://www.reddit.com)                   | SNS          | 公式 API                                          | Reddit のアプリで許可                          | 高評価・保存                 |
| [X](https://x.com)                                 | SNS          | [twilog](https://twilog.togetter.com) の MCP 経由 | twilog の MCP で許可                           | 高評価・保存                 |
| [はてなブックマーク](https://b.hatena.ne.jp)       | ブックマーク | 公式 API                                          | はてな ID                                      | 保存                         |
| [Raindrop.io](https://raindrop.io)                 | ブックマーク | 公式 API                                          | テストトークン                                 | 保存                         |
| [GitHub](https://github.com)                       | ブックマーク | 公式 API                                          | ユーザー名                                     | 高評価・フォロー             |
| [Qiita](https://qiita.com)                         | ブックマーク | 公式 API                                          | ユーザー名                                     | 保存                         |

## 取り方ごとの違い

| 取り方                               | 最初につないだとき       | そのあと                                     | 危険                                              |
| ------------------------------------ | ------------------------ | -------------------------------------------- | ------------------------------------------------- |
| 公式 API・公開データ・他サービス経由 | 過去へ遡って読む         | 1 時間ごとに新しい分を読む                   | なし                                              |
| 非公式 API                           | 過去へ遡って読む         | 1 時間ごとに新しい分を読む                   | [非公式の API の危険](#非公式の-api-の危険)を参照 |
| 書き出しファイル                     | CSV をサイトから取り込む | 自動では読み直さない。書き出し直して取り込む | なし                                              |

同じ記録を複数回取り込んでも、重複は発生しない。

## 取れる記録

| 記録     | 中身                             |
| -------- | -------------------------------- |
| 履歴     | 見た・聴いた・読んだ・遊んだ記録 |
| 高評価   | 高評価や星                       |
| 保存     | ライブラリやブックマーク         |
| フォロー | 作者やチャンネルのフォロー       |

## 非公式の API の危険

非公式 API とは、konomi がブラウザのログイン Cookie やパスワードを保持し、Web 版やアプリが内部的に呼び出す API を読み取る仕組みのことである。
サービス側がこれを利用規約への違反と判断した場合、アカウントを停止することがある。
API が予告なく変更された場合、konomi が修正されるまで取り込みは停止される。

渡す Cookie やパスワードは、それ自体でアカウントにログインするための鍵だ。
konomi はそれを暗号化して D1 に保管しているが、Cloudflare アカウントを乗っ取った者なら誰でも読み取ることができる。

YouTube の Cookie は、シークレットウィンドウでログインした後にそのウィンドウを閉じると、より長く保持される。
fork を使用する際は、例えば読み取り間隔を短くするなどして、アクセス量を増やさないようにすること。

## 自分の Cloudflare に置く

### 前提

[Vite+](https://viteplus.dev/guide/) の `vp`、Workers Paid プランの Cloudflare アカウント、およびそのアカウントのドメインが必要だ。

### 手順

1. このリポジトリを fork して clone する
2. 次のコマンドで、ドメインを指定してデプロイする

   ```sh
   vp install
   vp run -r login
   KONOMI_DOMAIN=<ドメイン> vp run -r deploy
   ```

3. デプロイしたサイトを開き、持ち主のアカウントを作る。作れるのは最初の 1 人だけ
4. 各サービスの欄を開き、そこに書かれた手順でログイン情報を入れるか、書き出しファイルを取り込む
5. MCP クライアントに `https://<ドメイン>/mcp` を登録し、OAuth でログインする。claude.ai ならコネクタとして登録する

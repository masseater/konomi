# konomi

自分の好みをパーソナルエージェントに知ってもらうための MCP サーバー。

- 見た動画や聴いた曲、読んだ本や遊んだゲーム、付けた高評価やフォローを、各サービスから自分の Cloudflare に集める
- 集めた記録を AI が MCP で読む
- ホスティングは提供していない。各自が自分の Cloudflare アカウントにデプロイし、自分の記録だけを入れて使う

## 公開先

- サイトは <https://konomi.masseater.dev>
- MCP は <https://konomi.masseater.dev/mcp>
- ログインできるのは持ち主の masseater だけ

## AI に頼めること

- 見た・聴いた・高評価・保存・フォローの記録を、サービスをまたいで語と種類と期間で探す
- 作品・作者・タグごとの好みの強さを、長く続く好みと最近の好みに分けて知る
- 文や記録と意味の近いものを、記録の中から探す
- 根拠の記録を付けた好みのメモを書き残し、次の会話で読み返す
- 取り込みが止まったサービスを見つけ、持ち主にログインし直すよう伝える

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

- 同じ記録を何度取り込んでも二重にはならない

## 取れる記録

| 記録     | 中身                             |
| -------- | -------------------------------- |
| 履歴     | 見た・聴いた・読んだ・遊んだ記録 |
| 高評価   | 高評価や星                       |
| 保存     | ライブラリやブックマーク         |
| フォロー | 作者やチャンネルのフォロー       |

## 非公式の API の危険

- ブラウザのログイン Cookie やパスワードを預け、Web 版やアプリが内部で呼ぶ API を読む
- 利用規約に反するとみなされれば、アカウントを止められることがある
- API の形が予告なく変わると、konomi を直すまで取り込みは止まる
- 預けた Cookie やパスワードはそれだけでアカウントにログインできる鍵
- konomi は暗号化して D1 に置くが、Cloudflare アカウントを乗っ取られれば読まれる
- YouTube の Cookie はシークレットウィンドウでログインして取り、そのウィンドウを閉じておくと長く切れない
- fork して使うときも、読む間隔を縮めるなどしてアクセスの量を増やさない

## 自分の Cloudflare に置く

### 前提

- [Vite+](https://viteplus.dev/guide/) の `vp`
- Workers Paid プランの Cloudflare アカウント
- そのアカウントに置いたドメイン

### 手順

1. このリポジトリを fork して clone する
2. 次のコマンドで、ドメインを指定してデプロイする

   ```sh
   vp install
   vp exec --filter web alchemy profile edit --add Cloudflare
   cd apps/web && KONOMI_DOMAIN=<ドメイン> vp run deploy
   ```

3. デプロイしたサイトを開き、持ち主のアカウントを作る。作れるのは最初の 1 人だけ
4. 各サービスの欄を開き、そこに書かれた手順でログイン情報を入れるか、書き出しファイルを取り込む
5. MCP クライアントに `https://<ドメイン>/mcp` を登録し、OAuth でログインする。claude.ai ならコネクタとして登録する

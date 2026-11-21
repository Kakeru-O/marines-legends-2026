# Content handling

GitHub Pagesで公開し、同じ内容の単一HTMLをローカルでも使います。リポジトリのvisibilityとPagesの公開状態は別の設定です。

## Gitに保持するもの

- `data/players_list.json`: 参加者・TEAM・イベント背番号・守備位置・表示順
- `data/players/*.json`: プロフィール・ロッテ限定成績・紹介文・日本シリーズ・出典URL
- 野手の `cheers.variants[]`: 後から入力する `lyrics` と `youtubeUrl` の枠

現在、歌詞は空文字です。歌詞本文を調査・転載しません。将来 `lyrics` を入力すると、次のビルドでローカルHTMLだけでなくPages用HTMLにも入り、公開されます。公開可能な内容だけを入力してください。空の歌詞・動画リンクは表示しません。既存の確認済み参考リンクは維持します。

## Gitに入れないもの

- 第三者が権利を持つ写真・動画・音源のコピー
- 生成済みの `dist/` 成果物

既存JSONの `links.officialEventImage` は出典情報として保持しますが、公開HTMLの表示には使用しません。公式画像に依存せず背番号を表示します。球団のロゴ・公式デザインはコピーしません。

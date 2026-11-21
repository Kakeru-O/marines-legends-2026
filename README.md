# Marines Legends 2026

2026年11月23日「マリーンズスペシャルゲーム2026」をスマホで楽しむための、球団非公式のOB選手名鑑です。GitHub Pagesとローカルの単一HTMLで閲覧できます。

## 使い方・ビルド

Node.js 22以上を使います。外部依存のインストールは不要です。

```sh
npm test
npm run build
```

- `dist/index.html`: GitHub Pagesのトップページ
- `dist/marines-legends.html`: 同一内容のオフライン向けファイル

どちらもCSS・JavaScript・全選手データを埋め込んでいます。HTMLを直接開いて利用でき、JavaScriptが無効でも全選手の `<details>` / `<summary>` を開閉できます。JavaScript有効時は名前・読み検索、TEAM・守備位置フィルター、人数表示を利用できます。外部リンクだけは通信が必要です。PDFはブラウザ印刷を使います。

開発中は `python3 -m http.server 8000` を実行し、`http://localhost:8000/src/` を開いてください（開発版のJSON読込みにはHTTPが必要）。完成版の確認はビルド後に `/dist/` を開きます。

## データ

```text
data/
├── players_list.json
└── players/<player-id>.json
```

`players_list.json` のschemaVersionは1です。各entryの `id`、`file`、`eventTeam`、`eventNumber`、`position`、`order` が参加一覧の正本です。`order` は一意な正整数で、配列順・ファイル名順によらずこの昇順で表示します。背番号 `00` は文字列で保持します。個別JSON内のイベント情報は互換性のためのミラーであり、変更時はmanifestと揃えてください。

プロフィール・成績・紹介文・日本シリーズ・出典の正本は個別JSONです。ビルド時に未登録JSON、欠落ファイル、id重複・不一致、イベント項目不一致、必須項目不足を検出します。ロッテ限定通算は他球団の数字を含めません。投球回の小数部はアウト数（.1 = 1/3回、.2 = 2/3回）です。

参加リストの確認日・公式発表との差分・調査方針は [確認記録](docs/roster-verification.md) を参照してください。選手情報は球団公式・NPB公式など各JSONの `sources` に遡れます。内容はユーザーの明示依頼に沿って追加し、推測で補完しません。

## 応援歌・写真

野手には複数の応援歌を記録する `cheers.variants[]` を用意しています。現在の `lyrics` は空文字で、本文の調査・転載は行いません。`youtubeUrl` がある場合にだけ動画リンクを表示し、両方空のvariantは表示しません。既存の参考リンクは維持します。

**将来 `lyrics` に入力した歌詞は、次回ビルドでPagesにも公開されます。** 公開可能な内容だけを入力してください。ローカル専用の分離機構はありません。

第三者の写真はコピーせず、`officialEventImage` も画面へ直接埋め込みません。出典URLと画像表示を分け、独自の白黒デザインと背番号を使います。詳しくは [コンテンツ方針](docs/local-content.md) を参照してください。

## GitHub Pages設定（ユーザー操作）

`.github/workflows/pages.yml` はPRでtest/buildを行い、mainへのpushまたはmainでの手動実行でartifactをPagesへdeployします。設定・visibilityは自動変更しません。

1. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定します。
2. PRを確認してmainへマージします。必要に応じてActionsからworkflowを手動実行します。
3. `github-pages` environmentに承認が必要なら、GitHubの画面でdeploymentを承認します。
4. 成功後、`https://kakeru-o.github.io/marines-legends-2026/` を開きます。

PrivateリポジトリのPages利用可否は契約プランに依存します。利用できない場合はプランまたは公開方針をユーザー側で判断してください。リポジトリのvisibilityはこの作業では変更しません。[GitHub公式: custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

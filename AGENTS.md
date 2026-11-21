# AGENTS.md

## Purpose

このリポジトリは、千葉ロッテマリーンズ「スペシャルゲーム2026」を観戦するための非公式デジタル選手名鑑を作る。

## Core Rules

1. スマホファーストで実装する。
2. GitHub Pagesでの一般公開を前提にし、repository visibilityやPages設定は明示指示なしに変更しない。
3. Pages用 `dist/index.html` とローカルで開ける `dist/marines-legends.html` を同じ単一HTMLから生成する。
4. 参加一覧・TEAM・イベント背番号・守備位置・表示順の正は `data/players_list.json`、プロフィール・成績等の正は `data/players/*.json` とする。
5. UIに選手固有の成績・紹介文・応援歌等をハードコードしない。
6. 明確な必要性がない限り、React / Vue / Svelte等のフレームワークを導入しない。
7. ビルドのためだけに過剰な依存関係を追加しない。

## Content Ownership

選手情報・成績・紹介文・応援歌・エピソード・外部リンク等のコンテンツは、ユーザーおよびChatGPTが作成・管理する。

Codexは、ユーザーから明示的に依頼されない限り、以下を行ってはならない。

- 選手情報を新規に作る
- 成績を推測・補完する
- 紹介文を書き換える
- 応援歌歌詞を追加・修正する
- YouTube等のURLを勝手に変更する
- 出典のないエピソードを追加する
- `data/players/*.json` の意味内容を都合よく改変する

実装上スキーマ変更が必要な場合は、既存データの意味を変えず、変更理由をPRに記載する。

## Implementation Responsibility

Codexの主担当:

- HTML / CSS / JavaScript
- レスポンシブUI
- 検索
- フィルター
- 選手詳細表示
- アクセシビリティ
- 単一HTMLへのビルド
- 印刷 / PDF向けCSS
- テスト
- 開発者向けドキュメント

## Accessibility / Mobile

- 主要操作は44px程度以上のタップ領域を確保する
- 横スクロールを前提にしない
- 文字サイズを極端に小さくしない
- 色だけで状態を区別しない
- キーボード操作でも破綻しない
- `prefers-reduced-motion` を尊重する

## Styling

- 白・黒を基調とする
- 公式球団サイトやロゴのコピーを避ける
- 読みやすさを優先する
- 懐かしさはアクセントとして扱う
- 過度なアニメーションは使わない

## Data

想定ファイル:

```text
data/players_list.json
data/players/<player-id>.json
```

UIはビルド時にmanifestで指定した選手JSONを `order` 順に読み込み、単一HTMLへ埋め込む。欠落・余分なJSON・重複・idやイベント情報の不一致はエラーにする。個別JSON内のイベント項目は互換性のためのミラーとし、manifestと同時に更新する。

公開成果物に応援歌歌詞を自動的に含める構造である。現時点の歌詞は空欄とし、明示依頼なしに調査・転載しない。第三者写真をコピーしたり `officialEventImage` を直接表示したりせず、背番号を表示する。

ローカルHTMLとして最終利用するため、完成時にはJSONを単一HTMLへ埋め込めるビルド方法を用意する。

## Pull Requests

PRには以下を含める。

- 変更内容
- 変更理由
- スマホ表示への影響
- テスト方法
- `data/players/*.json` を変更した場合は、その理由

コンテンツ変更とUI変更は可能な限り分離する。

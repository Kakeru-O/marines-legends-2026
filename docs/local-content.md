# Local-only content

このプロジェクトでは、一般公開に適さない可能性のある素材をGit管理対象から分離します。

## Gitに入れないもの

- 応援歌の歌詞全文
- 球団・報道各社など第三者が権利を持つ写真のコピー
- 個人利用のために保存した動画・音源
- それらを埋め込んだ最終成果物

以下のディレクトリは `.gitignore` の対象です。

```text
local-data/
local-assets/
dist/
```

## 想定構成

```text
local-data/
└── cheers.private.json

local-assets/
└── players/
    ├── watanabe-shunsuke.webp
    └── ...

dist/
└── marines-legends.html
```

`data/players.json` には、公開情報として扱いやすい事実データ、自作の紹介文、参照URL、ローカル素材のキーだけを置きます。

歌詞などのローカル専用データはビルド時にマージする想定です。

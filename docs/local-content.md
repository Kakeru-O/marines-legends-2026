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


## 応援歌歌詞の追加方法

リポジトリ内の `examples/cheers.private.example.json` を参考に、ローカルで次のファイルを作成します。

```text
local-data/cheers.private.json
```

例:

```json
{
  "saburo": {
    "lyrics": "ここに個人利用用の歌詞を記入",
    "selectedVariant": "2002–2009"
  }
}
```

`local-data/` はGit管理対象外です。ビルド時に `localContentKey` を使って `data/players.json` の `cheers` 情報へマージされ、生成された `dist/marines-legends.html` にのみ反映されます。

応援歌が複数ある選手では、`selectedVariant` に使用したい時期を記録しておくと管理しやすくなります。

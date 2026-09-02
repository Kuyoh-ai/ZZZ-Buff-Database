# ZZZ Buff Database

ゼンレスゾーンゼロの各エージェントが与えるバフ/デバフの効果量を、キャラ=行・ステータス=列のテーブルで一覧するサイトです。

公開ページ: https://kuyoh-ai.github.io/ZZZ-Buff-Database/ (main への push で GitHub Actions が自動デプロイ)

- 列見出しクリックでソート、Shift+クリックで複数キーソート
- 心象映画(M0〜M6)とモチーフ音動機(なし/P1〜P5)を一括設定・キャラごとの個別設定で切り替え
- アタッカー(受け手)を指定すると、そのキャラに有効なバフのセルが強調表示
- 属性/役割/陣営/レアリティのフィルタと名前検索
- 「自バフを除く」(既定ON)でパーティ/敵への効果だけを表示。OFFにすると自身のみのバフ(セルに「自」印)も合算

## 起動・ビルド

```bash
npm install
npm run dev        # 開発サーバー (http://localhost:5173)
npm run build      # 型チェック + dist/ へ静的ビルド
npm run preview    # ビルド結果の確認
```

検証コマンド:

```bash
npm test               # 計算ロジックのユニットテスト
npm run validate-data  # データJSONのスキーマ検証
npm run check-anim     # CSSアニメーションが0.5s以内か検証(ロード演出は除外)
```

`dist/` は相対パスでビルドされるので、GitHub Pages などにそのまま置けます。

## データの構造

| ファイル | 内容 |
|---|---|
| `src/data/characters.json` | エージェント一覧(名前/属性/役割/陣営/レア/モチーフ音動機/実装Ver) |
| `src/data/buffs/<characterId>.json` | そのキャラが与えるバフ/デバフ |
| `src/data/stats.ts` | ステータス列の定義(キー、日本語ラベル、単位、デバフ/属性付きフラグ) |
| `src/data/labels.ts` | 属性/役割/陣営の日本語ラベル |
| `src/data/unresolved.md` | 数値が確認できず未収録のバフの一覧 |

### バフJSONの例

```json
{
  "characterId": "nicole",
  "buffs": [
    {
      "id": "nicole_ex_def_down",
      "name": "強化特殊スキル: 防御力ダウン(エーテル領域)",
      "stat": "enemy_def_down_pct",
      "target": "enemy",
      "values": { "base": 25, "m6": 40 },
      "wengine": { "p1": 0, "p2": 0, "p3": 0, "p4": 0, "p5": 0 },
      "duration": "3.5s",
      "note": "強化特殊スキル/連携スキル/終結スキルのエーテル領域内の敵",
      "sourceUrl": "https://wiki.hoyolab.com/pc/zzz/entry/..."
    }
  ]
}
```

フィールドの意味:

- `stat`: `src/data/stats.ts` に登録されたキー。属性付きstat(`dmg_pct_element`, `enemy_res_down_pct`)は `element` が必須
- `target`: `self`(自身のみ) / `team`(チーム全員) / `enemy`(敵へのデバフ) / `next_swap_in`(次に登場するキャラ)
- `condition`: 受け手の条件。`elements` / `factions` / `roles`(いずれかに一致) / `excludeSelf`
- `values`: 心象映画段階ごとの**実効値**。`base` が M0。`m1`〜`m6` は「その段階で値が変わる場合のみ」書く(書かない/`null` は前段階から変化なし)
- `wengine`: モチーフ音動機装備時に**加算**する値(P1〜P5)。音動機で変化しないバフは省略
- `maxStacks`: 最大スタック数(既定1)。`values` は1スタックあたりの値。テーブルには最大スタック時の合計を表示
- `sourceUrl`: 必須。数値を確認したページのURL

値の解決: `効果量 = values[適用中の最大段階] + wengine[P] (装備時)` を `maxStacks` 倍。

条件付き・可変の効果(「自身の貫通率の一定割合」「攻撃力のX%、上限Y」など)は**最大値(上限値)**を記載し、式や条件は `note` に書きます。

### データの追加・修正

1. `src/data/buffs/<characterId>.json` を編集(新キャラは `characters.json` にも追加)
2. `npm run validate-data` でスキーマ検証
3. 陣営を追加する場合は `src/data/labels.ts` の `FACTION_LABEL` にIDと日本語名を追加

参照元の優先順位: HoYoWiki → Game8 → wikiwiki.jp/zenless → Prydwen。

## 技術構成

Vite + React + TypeScript。状態管理はReact標準のみ。設定(一括/個別)は localStorage に保存されます。

## 免責

本サイトは非公式のファン製作物です。ゲーム内の表記・数値は公式の情報を優先してください。公式のイラスト等の画像素材は同梱していません。

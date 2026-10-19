# ZZZ Buff Database

ゼンレスゾーンゼロの各エージェントが与えるバフ/デバフの効果量を、キャラ=行・ステータス=列のテーブルで一覧するサイトです。

公開ページ: https://kuyoh-ai.github.io/ZZZ-Buff-Database/ (main への push で GitHub Actions が自動デプロイ)

- 列見出しクリックでソート、Shift+クリックで複数キーソート
- 心象映画(M0〜M6)とモチーフ音動機(なし/P1〜P5)を一括設定・キャラごとの個別設定で切り替え
- アタッカー(受け手)を指定すると、そのキャラに有効なバフのセルが強調表示
- 属性/役割/陣営/レアリティのフィルタと名前検索
- 「自バフを除く」(既定ON)でパーティ/敵への効果だけを表示。OFFにすると自身のみのバフ(セルに「自」印)も合算
- 「ダメージ比較」ビュー: アタッカー・敵(危局強襲戦 Ver.3.x のボスプリセット)・ブレイク/ミアズマシールド・3 枠目・固定バフ(危局/激変ノード/手入力)を固定し、各キャラをチームに加えたときのアタッカーの期待ダメージ比(基準 = ×1.00)を一覧

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
python scripts/e2e.py e2e-out   # 画面の操作検証(npm run dev を起動した状態で)
python scripts/fetch-agent-stats.py   # HoYoWiki API から agent_stats.json を再生成
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
| `src/data/formula.md` | ダメージ比較の計算式・stat キーと乗算枠の対応・ディスク/敵の初期値の根拠 |
| `src/data/agent_stats.json` | 全エージェントの Lv60 基礎ステータス・コアスキル強化・モチーフ音動機(HoYoWiki API から `scripts/fetch-agent-stats.py` で生成) |
| `src/data/enemies.json` | 敵プリセット(危局強襲戦 Ver.3.0〜3.2 のボス。防御/耐性/弱体倍率) |
| `src/data/disc_presets.ts` | 役割別のディスク「平均ビルド」既定値 |
| `src/data/fixed_presets.ts` | 危局強襲戦 / 激変ノードのバフのプリセット |

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
- `target`: `self`(自身のみ) / `team`(チーム全員) / `enemy`(敵へのデバフ) / `next_swap_in`(次に登場するキャラ) / `active`(出場中のメンバー。出し手が控えの時に付与、自身以外) / `bench`(控えのメンバー。アタッカーには乗らない)
- `modes`: その効果が乗るダメージ比較の計算モード(`direct` / `anomaly` / `abloom` / `disorder` / `grievous`)。未指定は全モード。狂咲ダメージ限定の耐性無視は `["abloom"]`、強撃(物理異常)限定は `["anomaly"]` のように書く
- `condition`: 受け手の条件。`elements` / `factions` / `roles`(いずれかに一致) / `excludeSelf`
- `values`: 心象映画段階ごとの**実効値**。`base` が M0。`m1`〜`m6` は「その段階で値が変わる場合のみ」書く(書かない/`null` は前段階から変化なし)
- `wengine`: モチーフ音動機装備時に**加算**する値(P1〜P5)。音動機で変化しないバフは省略
- `potential`: ポテンシャル解放(T1〜T6)で値が変わる/追加される場合の段階別実効値(心象映画の解決後に上書き)。対象キャラは `characters.json` で `hasPotential: true`
- `maxStacks`: 最大スタック数(既定1)。`values` は1スタックあたりの値。テーブルには最大スタック時の合計を表示
- `sourceUrl`: 必須。数値を確認したページのURL
- `name`: 追加能力由来のバフは名前に「追加能力」を含める(例「追加能力: 〜(〜)」)。UI の追加能力トグル(一括/個別)はこの文字列で対象を識別する。発動条件は `characters.json` の `additionalAbility` に記載
- `additionalAbility.activation`(`characters.json`): 発動条件の構造化(`sameElement` / `sameFaction`(大区分で判定) / `roles` / `parrySupport` / `potentialRoles`(ポテンシャル解放 T1 以降で追加される役割)、OR 条件)。アタッカー選択時に「出し手 + アタッカーの2人編成」で条件を満たすかを自動判定し、各行の追加能力チェックを切り替えるのに使う(3人目は未考慮。手動で変更可、解除で元に戻る)。`conditionShort` の項目数と一致させる(validate-data が検証)
- `assist`(`characters.json`): 支援スキルの種類 `parry`(パリィ支援)/ `evasive`(回避支援)。HoYoWiki の支援スキル名から取る。シーザーの「パリィ支援可能な他メンバー」条件の判定に使う

値の解決: `効果量 = values[適用中の最大段階] + wengine[P] (装備時)` を `maxStacks` 倍。

条件付き・可変の効果(「自身の貫通率の一定割合」「攻撃力のX%、上限Y」など)は**最大値(上限値)**を記載し、式や条件は `note` に書きます。

### データの追加・修正

1. `src/data/buffs/<characterId>.json` を編集(新キャラは `characters.json` にも追加)
2. `npm run validate-data` でスキーマ検証
3. 陣営を追加する場合は `src/data/labels.ts` の `FACTIONS` に ID・日本語名・大区分(group)・色帯の色を追加(配列順が既定の並び順)。同陣営判定は大区分単位(防衛軍/治安局/ロスカリファ)

参照元の優先順位: HoYoWiki → wikiwiki.jp/zenless → Game8。gamewith は精度が低いため参照元にしない。

HoYoWiki はブラウザ描画が必要でそのままでは読めませんが、公開 API から JSON を取得できます。`python scripts/fetch-hoyowiki.py <出力先> ja-jp` でエージェント/音動機の全エントリ(スキル・心象映画・ポテンシャル解放・精錬効果)をテキスト化して保存でき、データ突合の一次情報として使います。

受け手の役割による有効判定(一覧の強調): 命破(rupture)には攻撃力/貫通率/貫通値のバフが乗らず、命破以外には透徹力/透徹ダメージが乗らない扱い。一覧の強調では簡略化して攻撃力を非適用にしているが、ダメージ比較の計算では攻撃力バフを 0.3 倍で透徹力に変換して反映する(貫通率/貫通値/敵防御ダウンは計算でも非適用)。

## ダメージ比較の前提

- 式は `src/data/formula.md`(wikiwiki ダメージ計算式 / 状態異常 / 儀玄 / クラレッタ、巴哈姆特の解析)。通常ダメージ = 攻撃力 × 与ダメ枠 × 会心期待値 × 防御枠(Lv60 係数 794) × 耐性枠 × 被ダメ枠 × ブレイク枠(弱体倍率は敵の上限でカット可)。命破は透徹力(0.3×攻撃力 + 0.1×HP)基準で防御枠なし、透徹ダメージ% は別枠乗算。鋭御は防御力基準で、会心時に会心ダメージの代わりに暴傷ダメージが乗り、会心率 100% 超過分で 2 段目の暴傷判定(200% まで)。鋭撃ダメージ%(stat `sharp_dmg_pct`、鋭御専用)は別枠乗算
- 計算モード: 直接攻撃(攻撃種別を選ぶと種別限定バフを含める。既定「汎用」は含めない) / 状態異常(異常マスタリー基準、会心なし。蓄積側を発動頻度として乗算可) / 狂咲(状態異常ダメージ × 狂咲ダメージ%) / 混沌(× 混沌ダメージ%) / 重傷(鋭御のみ。鋭撃ダメージの単発ヒットで、攻撃種別限定バフを含めず重傷ダメージ倍率を別枠で乗せる。鋭御を選ぶと既定)。「状態異常に会心を適用」は Ver.3.3 以降の仕様の受け口(既定 OFF)
- アタッカーの常時ステータスは Lv60 + モチーフ音動機 + 役割別ディスク既定値(S 級 Lv15、有効サブ命中 24 回前後)で自動計算し、各欄を上書き可
- バフは既存一覧と同じく常時発動・最大スタック・上限値。追加能力は同席メンバー(アタッカー・3 枠目・比較対象)で発動条件を判定し、候補がアタッカーの追加能力を発動させる場合はその分も比率に含める(行に表示)
- 敵の弱点/耐性は ±20% の仮定(個別 % は非公開)。流明(レミエール)の耐性対応は未確認のため 0% 扱い

## favicon / OGP 画像

`public/favicon.svg` が元データです。PNG 版(favicon-32 / apple-touch-icon / icon-192 / icon-512)と OGP 画像 `public/og.png` は `python scripts/gen-assets.py` で再生成できます(OGP のレイアウトは `scripts/assets/og-template.html`)。

## 技術構成

Vite + React + TypeScript。状態管理はReact標準のみ。設定(一括/個別)は localStorage に保存されます。

## 免責

本サイトは非公式のファン製作物です。ゲーム内の表記・数値は公式の情報を優先してください。公式のイラスト等の画像素材は同梱していません。

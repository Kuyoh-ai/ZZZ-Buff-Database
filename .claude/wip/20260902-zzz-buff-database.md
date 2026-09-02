# WIP: ゼンレスゾーンゼロ バフ/デバフ データベースサイト

- 作成日: 2026-09-02
- status: done
- 元の依頼: ゲーム ゼンレスゾーンゼロの各キャラクターが与えるバフ、デバフの効果量をテーブルで整理しながら確認できるwebサイトを作成してください。メインは各ステータスに対するバフ、デバフ量がキャラクターを行としたテーブルで整理されており、複数の条件でソートができるデータベースです。キャラクターには心象映画6段階(いわゆる凸)とモチーフ音動機(こちらも凸有)があり、それによっても効果量が変わるため、それぞれの凸量や音動機は一括設定や個別設定できるようにしてください。また、アタッカー(バフの受け取り手)となるキャラクターを指定すると有効なバフステータスが強調されると良いです。データはhoyowikiや有志のwikiを参照し、デザインはゼンレスゾーンゼロのコンセプトにそろえてください。アニメーションはスキルを参照して付加し、アニメーション時間は0.5s以内に収めてください(ロードアニメーションは除く)
- 質問への回答(2026-09-02): 技術=Vite+React+TypeScript / 収録=全キャラ(A級含む)可能な限り / 対象=数値化できるバフ・デバフのみ / データ=Claudeがwikiを参照してJSONを手動作成

## Goal（大目標）

ZZZの全プレイアブルキャラクターについて「味方(または敵)に与えるバフ/デバフの効果量」を、キャラを行・ステータスを列としたテーブルで一覧・ソートでき、心象映画(0〜6)とモチーフ音動機(未装備/凸1〜5)の設定を一括/個別に切り替えると効果量が再計算され、アタッカーを指定するとそのアタッカーに有効なバフだけが強調表示される、ZZZ風デザインの静的Webサイト(Vite+React+TS)が `npm run build` で生成される。

## Non-goals（やらないこと）

- ダメージ計算機・最適編成の提案(効果量の一覧に限定)
- 数値化できない効果(「〜状態を付与」「行動速度変化」等の文章のみの効果)の収録
- 自己バフのうち「自身のみ・他者に波及しない」もの ※ただし自己バフも「対象=自身」として列に載せる価値があるため、数値化できるものは収録対象(受け手=自身)とする
- キャラの基礎ステータス・スキル倍率・音動機の基礎攻撃力の収録
- バックエンド/DB/ログイン機能(すべて静的JSON)
- 画像素材の同梱(公式イラストは著作権上同梱しない。属性/陣営/役割はアイコンをSVG/文字で表現)
- 英語UI(日本語UIのみ。データのキャラ名は日本語+英語IDを持つ)

## 完了条件

| ID | 完了条件 | 検証手段 |
|------|----------|----------|
| AC-1 | `npm install && npm run build` がエラーなく完了し `dist/` に静的サイトが出力される | V-1 |
| AC-2 | データJSONがスキーマ(zod)に適合し、全キャラ分(2026-09時点で実装済みの全プレイアブル、最低40体)のエントリを持ち、各バフに参照元URLがある | V-2 |
| AC-3 | メインテーブルがキャラ=行、ステータス=列で表示され、任意の列クリックでソート、Shift+クリックで複数キーソート(昇順/降順トグル)ができる | V-3, V-6 |
| AC-4 | 一括設定(心象映画0〜6、音動機 なし/凸1〜5)を変更するとテーブルの効果量が再計算される | V-4, V-6 |
| AC-5 | 個別設定(キャラごとの心象映画/音動機)が一括設定を上書きし、個別設定をリセットすると一括設定に戻る | V-4, V-6 |
| AC-6 | アタッカーを選択すると、そのアタッカー(属性/陣営/役割/特性)に適用可能なバフのセルが強調され、適用不可のセルが減光される。アタッカー自身の行は「自己バフ」として表示される | V-5, V-6 |
| AC-7 | 属性/陣営/役割/レアリティでのフィルタと名前検索ができる | V-6 |
| AC-8 | デザインがZZZのコンセプト(黒×ライムイエロー、斜めストライプ、太字イタリック見出し、ハーフトーン等)に沿っており、ロード演出以外のCSSアニメーション/トランジションの duration がすべて 0.5s 以下 | V-7, V-8 |
| AC-9 | 効果量の計算ロジック(凸段階/音動機凸による値の解決、アタッカー適用判定)がユニットテストで検証されている | V-4, V-5 |
| AC-10 | README にデータの追加/修正方法(JSONの構造、参照元の記載ルール)と起動・ビルド手順が書かれ、記載どおりのコマンドが動く | V-1, V-9 |

## 検証手段

| ID | 何を | どう確認するか（コマンド/手順） | 期待結果 |
|-----|------|--------------------------------|----------|
| V-1 | ビルド | `cd c:/Users/k3cat/Documents/Dev/zzz-buff-database && npm install && npm run build` | exit 0、`dist/index.html` が存在、`npx tsc --noEmit` も exit 0 |
| V-2 | データ検証 | `npm run validate-data`(scripts/validate-data.ts: zodスキーマ照合+キャラ数+各バフのsourceUrl必須+重複IDチェック) | exit 0、"characters: N (N>=40)" が出力される |
| V-3 | ソート | `npm test`(src/lib/sort.test.ts: 単一キー昇順/降順、複数キー、欠損値(undefined)は常に末尾) | 全テスト pass |
| V-4 | 効果量解決 | `npm test`(src/lib/resolve.test.ts: 心象映画0/2/6と音動機なし/凸1/凸5の組合せで期待値一致、個別設定が一括設定を上書き、個別リセットで一括に戻る) | 全テスト pass |
| V-5 | 適用判定 | `npm test`(src/lib/applicability.test.ts: 属性条件/陣営条件/役割条件/全体/自身のみ/「次に登場するキャラ」の各パターンで applies が期待通り) | 全テスト pass |
| V-6 | UI操作 | Playwright(example-skills:webapp-testing)で `npm run dev` を起動し、(a)列ヘッダクリックで行順が変わる (b)一括心象映画を0→6にしてセル値が変わる (c)個別設定で1キャラのみ変えてそのキャラだけ変わる (d)アタッカー選択で `.cell--applicable` と `.cell--muted` が両方存在 (e)属性フィルタで行数が減る、をスクリーンショット付きで確認 | 各項目が期待通り |
| V-7 | アニメ時間 | `npm run check-anim`(scripts/check-anim.mjs: src/**/*.css の `animation`/`transition` の duration を正規表現で抽出し、`.loading` 系セレクタ以外で 500ms 超があれば exit 1) | exit 0 |
| V-8 | デザイン目視 | V-6 のスクリーンショットで、黒基調+ライムイエロー(#D6FF00系)のアクセント、斜めストライプ/ハーフトーン、イタリック太字見出しが確認できる | 目視で確認しユーザーに提示 |
| V-9 | README | README の手順どおりに `npm run dev` を実行し localhost で表示される。README記載のJSON例が `npm run validate-data` を通る | 表示OK・validate exit 0 |

## 設計メモ(委譲先が読むための確定事項)

### ステータス列(stat キー)
`atk_pct, atk_flat, crit_rate, crit_dmg, dmg_pct(全ダメージ), dmg_pct_element(属性一致ダメージ), pen_ratio, pen_flat, anomaly_proficiency, anomaly_mastery, anomaly_buildup_pct, energy_regen, energy_gain_flat, impact_pct, daze_pct(与ブレイク値), enemy_def_down_pct, enemy_res_down_pct(属性耐性減。element付き), enemy_dmg_taken_pct(被ダメ増), enemy_stun_dmg_multiplier(ブレイク弱体倍率増), disorder_dmg_pct, ult_dmg_pct, ex_dmg_pct, chain_dmg_pct, basic_dmg_pct, dash_dmg_pct, assist_dmg_pct, atk_speed_pct, sheer_force_pct, sheer_force_flat, adrenaline`
必要に応じて追加可。追加時は `src/data/stats.ts` に日本語ラベルと表示単位を登録する。

### バフエントリ(JSON)
```
{
  "id": "nicole_ex_def_down",
  "name": "強化特殊スキル 防御力ダウン",
  "stat": "enemy_def_down_pct",
  "target": "enemy" | "team" | "self" | "next_swap_in" | "conditional",
  "condition": { "elements"?: [...], "factions"?: [...], "roles"?: [...], "excludeSelf"?: bool },
  "values": { "base": 25, "m1": null, "m2": 40, ... "m6": ... },   // 凸段階での上書き。nullは変化なし
  "wengine": { "base": 0, "p1": 10, "p2": 11, "p3": 12, "p4": 13, "p5": 14 },  // 加算。モチーフ音動機装備時のみ
  "stack": 1, "duration": "10s", "note": "条件の要約", "sourceUrl": "https://..."
}
```
値は**加算**で解決: value = values[最大の適用済み凸段階] + wengine[phase] (装備時)。心象映画で値が上書きされる場合は該当段階に値を書く(累積ではなく「その段階での実効値」)。

### 参照元の優先順位
1. HoYoWiki (https://wiki.hoyolab.com/pc/zzz/) 2. Game8 ZZZ攻略 3. ZZZ wiki (wikiwiki.jp/zenless) 4. Prydwen (英語) — 各バフに1つ以上URLを記載。数値が取れなかったバフは `values.base: null` で入れず、`unresolved.md` に列挙する。

## TODO

| ID | 内容 | 完了条件 | 担当 | モデル | status |
|-----|------|----------|------|--------|--------|
| T-1 | Vite+React+TS 雛形、vitest、zod、ESLint、npm scripts(validate-data, check-anim) の骨組み作成 | AC-1, AC-9 | self | - | done |
| T-2 | 型定義(`src/types.ts`)・stat定義(`src/data/stats.ts`)・キャラ基本情報(名前/属性/陣営/役割/レア/モチーフ音動機名)の一覧JSON `src/data/characters.json` | AC-2 | self | - | done |
| T-3 | 計算ロジック実装+テスト: resolve(凸/音動機)・applicability(アタッカー適用判定)・sort(複数キー) | AC-3, AC-4, AC-5, AC-6, AC-9 | self | - | done |
| T-4a | バフデータ収集 グループA(1.0〜1.3のキャラ ≈18体) → `src/data/buffs/<id>.json` | AC-2 | subagent | sonnet | done |
| T-4b | バフデータ収集 グループB(1.4〜2.0のキャラ ≈14体) | AC-2 | subagent | sonnet | done |
| T-4c | バフデータ収集 グループC(2.1以降のキャラ 残り全員) | AC-2 | subagent | sonnet | done |
| T-5 | データ検証スクリプト(`scripts/validate-data.ts`)と unresolved.md の集約 | AC-2 | self | - | done |
| T-6 | UI実装: レイアウト、設定パネル(一括/個別)、アタッカー選択、フィルタ/検索、メインテーブル(ソート/強調) | AC-3〜AC-7 | self | - | done |
| T-7 | ZZZ風デザイン+CSSアニメーション(css-animation-skill 参照、0.5s以内)、check-anim スクリプト | AC-8 | self | - | done |
| T-8 | README(起動/ビルド/データ追加方法) | AC-10 | self | - | done |
| T-9 | Playwright での UI 検証(V-6)+スクリーンショット、全 V-* 実行 | AC-1〜AC-10 | self | - | done |
| T-10 | データレビュー: 収集JSONの数値をHoYoWikiと突合(サンプリング各グループ3体) | AC-2 | subagent | opus | done |

## オーケストレーションパス

```
T-1 → T-2 (型/スキーマ/キャラ一覧を確定。委譲の前提)
   ↓
[並列] T-3(self), T-4a(sonnet), T-4b(sonnet), T-4c(sonnet)   ※触るファイルが重ならない
   ↓ T-4* 完了後
T-5(self: 検証スクリプト+unresolved集約) → T-10(opus: 突合レビュー) → 修正
   ↓ T-3 完了後(T-4と並行可)
T-6(self) → T-7(self) → T-8(self)
   ↓ 全完了後
T-9(self: 全検証)
```

## 実行ログ / リプラン履歴

- 2026-09-02 09:50 作成。ユーザー質問4件に回答済み。

## クローズチェックリスト

- [x] すべての検証手段（V-*）を実際に実行し、結果を実行ログに記録した
- [x] 完了条件（AC-*）ごとに達成を確認した（未達成があれば区別して報告した）
- [x] ユーザーに完了報告した
- [x] WIP の扱い（保持/削除）をプロジェクト方針に従って処理した
- 2026-09-02 10:09 T-1,T-3 done(npm test 36 pass)。キャラ一覧調査はsubagent実行中
- 2026-09-02 10:30 T-6/T-7/T-8 実装完了(型チェックは characters.json 待ち)。check-anim OK
- 2026-09-02 10:45 characters.json 到着(55体, Ver3.1まで)。T-4 は4グループ(A1/A2/B/C)に分割して並列委譲(1.0-1.2が22体と多いため)
- 2026-09-02 12:10 46/57 バフファイル収集済。cleanup-data.py で element:all/編成条件/音動機欠損を正規化。E2E(V-6) 13/13 pass。残り11体(A2a/A2b)を再委譲中
- 2026-09-02 13:05 **中断(ユーザーのリミット到達)**。状態: 全57体のバフJSON(388件)収集済・validate OK、cleanup-data.py と Opus レビュー(9体サンプル)で系統的誤りを修正済、unresolved.md 作成済。npm test 37 pass / check-anim OK / build OK / E2E 13/13 pass(46体時点、要再実行)。
  - 停止したエージェント: A2a(zhu_yuan/jane_doe/qingyi/seth の再調査。既存ファイルは旧A2エージェント作成の game8.co ベースで validate 済なので致命的ではない)
  - **再開時の残タスク(T-9)**: (1) `python <webapp-testing>/scripts/with_server.py --server "npm run dev" --port 5173 -- python scripts/e2e.py <outdir>` で V-6 再実行 (2) V-9: README 手順の確認 (3) unresolved.md「系統的な注意点」のコアスキルLv基準の統一(anby, billy, nekomata, nicole, trigger, astra, evelyn を最大Lvへ)は任意 (4) 完了報告・クローズチェックリスト
  - 未コミット(ユーザー未指示のため)。git status で全ファイル untracked
- 2026-09-02 12:08 再開。ユーザー指摘: 条件付きバフは最大値(subagent委譲中)、自バフを除くチェック(既定ON)実装、陣営名修正(怪談屋/妄想エンジェル/新エリー都治安局に統合/スターズ・オブ・リラ/ロスカリファに統合)
- 2026-09-02 (再開後) 最終検証: V-1 build OK / V-2 validate OK(57体, 388件) / V-3〜V-5 npm test 40 pass / V-6 E2E 14/14 pass(スクリーンショット scratchpad/e2e3) / V-7 check-anim OK / V-8 目視OK / V-9 README手順どおり dev 起動・JSON例は validate 通過。条件付きバフの最大値化(subagent + Rina手動修正)、自バフ除外チェック、陣営名修正を反映。
- 2026-09-02 12:23 ユーザー指摘(ダイアリン会心DMG): 音動機バフの base=p1 二重計上 6件、wengine欠落で常時表示 19件、値ゼロで表示不能 10件 を修正。validate OK
- 2026-09-02 12:25 セル表示を「パーティ向け合計」+「自 +X(別枠)」に分離(合算をやめた)。ソートもパーティ向け値基準。E2E 14/14, test 41

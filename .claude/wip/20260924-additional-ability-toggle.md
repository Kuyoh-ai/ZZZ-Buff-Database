# WIP: 追加能力バフの適用トグル(一括/個別、エージェント列3行目の条件付きチェックボックス)

- 作成日: 2026-09-24
- status: done <!-- planning / in-progress / blocked / done -->
- 元の依頼: コアパッシブのうち追加能力の適用をトグルする機能を追加してください。一括と個別それぞれ追加し、エージェント列の3行目に追加能力条件を記載するチェックボックスも追加してください デフォルトON

## Goal（大目標）

「追加能力」由来のバフ/デバフを表の集計から除外/含めるトグルが、一括設定(01 パネル)とキャラ個別(エージェント列3行目のチェックボックス、ラベルに発動条件を表示)の両方にあり、既定は ON。個別は一括を上書きし、既存のリセット操作で一括に戻る。設定は ブラウザ保存(localStorage)され、既存の保存設定でも既定 ON になる。

## Non-goals（やらないこと）

- 追加能力以外(コアパッシブ本体、心象映画、音動機、ポテンシャル)のトグル
- 発動条件を満たすかの自動判定(チーム編成に応じて自動 ON/OFF)。あくまで手動トグル
- バフデータ(buffs/*.json)の値・note の変更
- 発動条件テキストの英語化

## 設計(確定)

- **追加能力バフの識別**: `buff.name` に「追加能力」を含むもの(現行データ 49 ファイルの全追加能力バフがこの命名。`src/lib/table.ts` に `isAdditionalAbility(buff)` を置く)
- **発動条件テキスト**: `characters.json` に `additionalAbility?: { name, condition, conditionShort, sourceUrl }` を追加(HoYoWiki から抽出、T-1)。schema.ts / types.ts に optional で追加
- **設定**: `CharSetting.additionalAbility: boolean`(既定 true)。`Settings.global` と `overrides` の両方で扱う。`effectiveSetting` / `hasOverride` に追加。localStorage 読込時 `??= true`
- **集計**: `buildRow` で `setting.additionalAbility === false` のとき追加能力バフを除外(excludeSelfBuffs と同じ位置)。`buffCount` にも反映
- **一括 UI**: SettingsPanel に「追加能力」行、segmented ON/OFF(`data-testid="global-aa-on|off"`)
- **個別 UI**: エージェント列の名前ボタン下(3行目)に `<label><input type="checkbox">追加能力: <conditionShort></label>`(`data-testid="row-aa-<id>"`、title に condition 全文)。`additionalAbility` データが無いキャラは「追加能力」のみ表示。チェック変更で `onOverride(id, { additionalAbility })`。一括と異なる場合は既存の上書きマーカー/リセットボタンが出る

## 完了条件

| ID | 完了条件 | 検証手段 |
|------|----------|----------|
| AC-1 | `characters.json` の全 58 体に `additionalAbility` が入り(HoYoWiki 未反映のキャラは condition 空で可)、schema 検証を通る | V-1, V-3 |
| AC-2 | `effectiveSetting` が additionalAbility を個別>一括>既定(true)の順で解決し、`hasOverride` が additionalAbility の上書きを検出する | V-2 |
| AC-3 | `buildRow` が additionalAbility=false のとき name に「追加能力」を含むバフをセルと buffCount から除外し、true のとき含める | V-2 |
| AC-4 | 一括設定パネルに追加能力 ON/OFF があり、OFF にすると追加能力バフのセル値が消え/減り、ON で戻る | V-4 |
| AC-5 | エージェント列3行目にチェックボックスがあり、ラベルに conditionShort が表示され、既定でチェック済み。外すとその行だけ追加能力バフが除外され、リセット(↺)で一括に戻る | V-4 |
| AC-6 | 既存の localStorage 設定(additionalAbility 無し)を読み込んでも既定 ON になる | V-2 |
| AC-8 | スターライト・ビリー・キッドが characters.json と buffs に収録され(additionalAbility 含む)、validate-data を通り、画面に行が表示される | V-1, V-3, V-4 |
| AC-7 | 既存テスト・validate-data・build が通り、e2e(scripts/e2e.py)が既存項目を含め全 PASS | V-1, V-2, V-4 |

## 検証手段

| ID | 何を | どう確認するか（コマンド/手順） | 期待結果 |
|-----|------|--------------------------------|----------|
| V-1 | スキーマ | `npm run validate-data` | OK、characters 58 |
| V-2 | ユニット | `npm test`。追加ケース: resolve.test(効果設定の解決、上書き検出、既定 true)、table.test(OFF で追加能力除外・buffCount 減、ON で含む、名前に「追加能力」を含まないバフは影響なし) | 全件 pass、追加ケース 5 件以上 |
| V-3 | データ内容 | `node -e` で characters.json の additionalAbility 有無・condition 空の id を列挙 | 58 体にキーあり。空の id は T-1 report の「未反映」一覧と一致 |
| V-4 | 画面(e2e) | `npm run dev` 起動後 `python scripts/e2e.py <scratch>/e2e-out`。追加項目: (a) global-aa-off クリックで koleda の cell-chain_dmg_pct(追加能力)が消える、global-aa-on で戻る (b) row-aa-koleda のラベルに「同属性 / 同陣営」を含む、チェックを外すと koleda のみ消え他行は残る、row-reset-koleda で戻る (c) 初期状態で row-aa-* が checked | 既存+追加項目すべて PASS、ページエラーなし |

## TODO

| ID | 内容 | 完了条件 | 担当 | モデル | status |
|-----|------|----------|------|--------|--------|
| T-1 | HoYoWiki API から全キャラの追加能力の名称・発動条件を抽出し JSON 草案を scratchpad に出力 | AC-1 | subagent | opus | done |
| T-2 | types.ts / schema.ts に `additionalAbility`(Character)と `CharSetting.additionalAbility` を追加。resolve.ts の effectiveSetting / hasOverride を拡張し resolve.test を追加 | AC-2, AC-6 | self | - | done |
| T-3 | table.ts に isAdditionalAbility と除外処理を追加し table.test を追加 | AC-3 | self | - | done |
| T-4 | App.tsx の DEFAULT_GLOBAL / loadSettings 移行(`??= true`) | AC-6 | self | - | done |
| T-5 | SettingsPanel に一括 ON/OFF を追加 | AC-4 | self | - | done |
| T-6 | BuffTable のエージェント列3行目にチェックボックスを追加、CSS 調整 | AC-5 | self | - | done |
| T-7 | T-1 の草案を検品し characters.json に反映 | AC-1 | self | - | done |
| T-8 | scripts/e2e.py に V-4 の追加項目を実装 | AC-7 | self | - | done |
| T-9 | V-1〜V-4 を全件実行し結果を記録 | AC-7 | self | - | done |
| T-10 | スターライト・ビリー・キッド(S級、HoYoWiki 収録済み・本サイト未収録)の基本情報・バフ・追加能力条件を HoYoWiki/wikiwiki から収集し草案を scratchpad に出力 | AC-8 | subagent | opus | done |
| T-11 | T-10 の草案を検品し characters.json / buffs/<id>.json に反映 | AC-8 | self | - | done |

## オーケストレーションパス

```
[並列] T-1(抽出/Opus、読み取り専用)  ‖  T-2 → T-3 → T-4 → T-5 → T-6 → T-8 (self、直列: 型→ロジック→UI)
   ↓ T-1 完了後
T-7(データ反映)  ‖  T-10(ビリー収集/Opus) → T-11(反映)
   ↓
T-9(検証)
```
※ T-1 は仕様に影響しない読み取り専用抽出のため、レビューゲート前に開始している(結果は反映せず scratchpad に留める)

## 実行ログ / リプラン履歴

- 2026-09-24 作成。T-1 を先行開始(scratchpad 出力のみ)

- 2026-09-24 ユーザー回答: (1) id と名前の対応は正しい。リナとヴェリナは別人。A級アンビー/ビリーの同陣営は邪兎屋、0号・アンビーはオボルス小隊(characters.json の陣営と一致を確認) (2) 読み仮名付き名称(nicole/qingyi/orphie/trigger)は読み仮名を外して表記統一 (3) スターライト・ビリー・キッドを T-10/T-11 として組み込み。承認として Phase 5 開始

- 2026-09-24 実行: T-2〜T-8 反映(types/schema/resolve/table/App/SettingsPanel/BuffTable/CSS/e2e)。table.test の期待値誤り(maxStacks 2 の見落とし)を修正。e2e の初回失敗 2 回(属性フィルタの再 ON でクレタ行が隠れた / 連携DMG を持つ比較行の選定ミス)は e2e スクリプト側を修正
- 2026-09-24 T-10 完了(Opus): スターライト・ビリー S/物理/命破/邪兎屋/Ver.2.8、バフ 15 件(全て self)、追加能力条件「[撃破] / [防護] / [支援]」、HoYoWiki と wikiwiki で一致。T-11 で characters.json / buffs/starlight_billy.json に反映。nameEn は HoYoWiki en-us の "Starlight - Billy" を採用
- 2026-09-24 検証: V-1 validate-data OK(characters 59、buffs 513)。V-2 npm test 58/58(追加 8 件)。V-3 additionalAbility 59/59、condition 空 0。V-4 e2e 28/28 PASS(追加 11 項目、既存 17 項目、ページエラーなし)。npm run build 成功。README のデータ規約に「追加能力」命名を追記

## クローズチェックリスト

- [x] すべての検証手段（V-*）を実際に実行し、結果を実行ログに記録した
- [x] 完了条件（AC-*）ごとに達成を確認した（未達成があれば区別して報告した）
- [x] ユーザーに完了報告した
- [x] WIP の扱い(保持)（保持/削除）をプロジェクト方針に従って処理した
- 2026-09-24 T-1 完了: 58/58 体で抽出、condition 空 0 件(scratchpad/additional-abilities.json)。副次的な気づき: HoYoWiki にあって characters.json に無いエージェント 4 体(セヴェリアン・ローウェル、フィオニー・レファエラ、ロクシー・イフリータ・プライス、スターライト・ビリー・キッド)

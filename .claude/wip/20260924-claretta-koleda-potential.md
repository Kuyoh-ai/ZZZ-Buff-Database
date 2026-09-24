# WIP: クラレッタ新規追加 + クレタのポテンシャル解放データ追加

- 作成日: 2026-09-24
- status: done <!-- planning / in-progress / blocked / done -->
- 元の依頼: 新キャラクター：クラレッタとクレタのポテンシャル解放が追加されたのでデータを更新してください。データ収集はopusサブエージェントに任せてオーケストレーターはオーケストレーションに注力してください

## Goal（大目標）

新キャラ「クラレッタ」が `characters.json` と `src/data/buffs/claretta.json` に収録され、既存キャラ「クレタ(koleda)」に `hasPotential: true` とポテンシャル解放(T1〜T6)の段階別数値が追加され、`npm run validate-data` と `npm test` が通り、サイト上でクラレッタ行とクレタのポテンシャル段階切替が機能する。

## Non-goals（やらないこと）

- クラレッタ・クレタ以外のキャラのデータ修正(誤りを見つけた場合は unresolved.md にメモのみ)
- UI/計算ロジックの変更(既存の `potential` フィールドの仕組みをそのまま使う)
- 数値化できない効果の収録(スキル仕様変更・倍率変化・UI変更は potential.md / unresolved.md に文章で記録)
- gamewith を参照元にすること(HoYoWiki → wikiwiki の優先順位。数値の裏付けが取れない項目は未収録+unresolved.md)

## 前提・規約(既存)

- 参照元優先順位: HoYoWiki(公式API: `python scripts/fetch-hoyowiki.py <outdir> ja-jp`) → wikiwiki.jp/zenless → Game8
- 条件付き・可変バフは上限値を `values` に、式を `note` に
- `potential.t1..t6` は心象映画解決後に上書きする段階別「実効値」。対象キャラは `characters.json` で `hasPotential: true`
- 陣営 ID は `src/data/labels.ts` の `FACTION_LABEL` に存在すること(新陣営なら追加)
- stat キーは `src/data/stats.ts` 登録済みのもののみ

## 完了条件

| ID | 完了条件 | 検証手段 |
|------|----------|----------|
| AC-0 | 役割 `armorer`(ラベル「鋭御」)が RoleSchema/Role 型/ROLE_LABEL に存在し、stat `sharp_crit_dmg`(暴傷ダメージ、グループ「ダメージ」、%)と `sharp_dmg_pct`(鋭撃ダメージ、同)が stats.ts に存在する | V-1, V-2 |
| AC-1 | `characters.json` にクラレッタのエントリ(id/nameJa/nameEn/rarity/element/role/faction/wengine/releaseVersion/sourceUrl)が追加され、陣営 ID が `FACTION_LABEL` に存在する | V-1, V-3 |
| AC-2 | `src/data/buffs/claretta.json` が作成され、収集結果(T-1)で数値化できた全バフ/デバフが `sourceUrl` 付きで収録されている(件数と内容は T-1 の結果一覧と一致) | V-1, V-3, V-4 |
| AC-3 | `characters.json` の koleda に `hasPotential: true` が付き、`buffs/koleda.json` に収集結果(T-2)で数値化できたポテンシャル効果が `potential.t1..t6` で収録されている | V-1, V-3, V-4 |
| AC-4 | `src/data/potential.md` の対象キャラ一覧にクレタが追加され、数値化できなかった効果が「未収録」節に記載されている。クラレッタで未収録となった効果が `unresolved.md` に記載されている | V-5 |
| AC-5 | 既存テストと検証スクリプトが全て通る | V-1, V-2 |
| AC-6 | ブラウザ上でクラレッタ行が表示され、クレタのポテンシャル段階(T0→T6)切替で該当セルの値が変化する | V-6 |

## 検証手段

| ID | 何を | どう確認するか（コマンド/手順） | 期待結果 |
|-----|------|--------------------------------|----------|
| V-1 | データスキーマ | `npm run validate-data` | `OK` で終了、`ERROR:` 行なし。characters 数が実行前より +1 |
| V-2 | ユニットテスト | `npm test` | 全件 pass |
| V-3 | 追加内容の照合 | `node -e` で `characters.json` から id=claretta と id=koleda を抽出し、`buffs/claretta.json` の buff 件数、`buffs/koleda.json` 内の `potential` を持つ buff 一覧を出力 | claretta エントリあり・koleda に `hasPotential: true`・potential 付き buff の id と値が T-1/T-2 の結果一覧(WIP「収集結果」節)と一致 |
| V-4 | 数値の一次情報照合(self でサンプル検品) | 収集結果の各 buff について sourceUrl を1件以上開き(HoYoWiki は `scripts/fetch-hoyowiki.py` の text 出力で可)、記載数値と JSON の値を突合 | 値・段階・対象(self/team/enemy)が一致 |
| V-5 | 文書 | `grep -n "koleda\|クレタ" src/data/potential.md` / `grep -n "claretta\|クラレッタ" src/data/unresolved.md` | 対象一覧行と未収録記述がある(未収録がゼロなら「なし」と明記) |
| V-6 | 画面 | `npm run dev` を起動し Playwright(`scripts/e2e.py` を参考)または手動で開く。クラレッタ行の存在、クレタ個別設定でポテンシャル T0/T6 を切替 | クラレッタ行が表示される。クレタの potential 付き列の値が T0 と T6 で異なる |

## TODO

| ID | 内容 | 完了条件 | 担当 | モデル | status |
|-----|------|----------|------|--------|--------|
| T-1 | クラレッタの基本情報と全バフ/デバフ数値を HoYoWiki/wikiwiki から収集し、schema 準拠の JSON 草案を scratchpad に出力 | AC-1, AC-2 | subagent | opus | done |
| T-2 | クレタのポテンシャル解放 T1〜T6 の数値効果を HoYoWiki/wikiwiki から収集し、koleda.json への追加/変更草案と未収録一覧を scratchpad に出力 | AC-3, AC-4 | subagent | opus | done |
| T-2b | 新役割「鋭御」(armorer) を schema.ts / types.ts / labels.ts に追加、新 stat「暴傷ダメージ」(sharp_crit_dmg、透徹DMG の右)を stats.ts に追加、applicability.ts に鋭御ルール(攻撃力/HP/会心DMG/透徹系 無効、暴傷DMG は鋭御のみ)とテストを追加 | AC-0 | self | - | done |
| T-3 | T-1 の草案を検品し `characters.json` / `buffs/claretta.json`(必要なら `labels.ts`)へ反映 | AC-1, AC-2 | self | - | done |
| T-4 | T-2 の草案を検品し `characters.json`(hasPotential) / `buffs/koleda.json` へ反映 | AC-3 | self | - | done |
| T-5 | `potential.md` / `unresolved.md` を更新 | AC-4 | self | - | done |
| T-6 | V-1〜V-5 を実行し結果を記録 | AC-5 | self | - | done |
| T-7 | V-6(画面確認) | AC-6 | self | - | done |

## オーケストレーションパス

```
[並列] T-1(調査/Opus), T-2(調査/Opus)   ※読み取り専用、出力は scratchpad。プロジェクトファイルは触らない
   ↓ 両方完了後(レビューゲート: 収集結果を WIP に転記してユーザー承認)
T-2b(役割/stat 追加、self)
   ↓
[直列] T-3 → T-4 → T-5   ※いずれも characters.json を触るため直列
   ↓
T-6 → T-7
```

## 収集結果(T-1 / T-2 の戻り値を転記)

草案ファイル(scratchpad): `claretta-draft.json` / `claretta-report.md` / `koleda-potential-draft.json` / `koleda-potential-report.md`

### T-1 クラレッタ(確信度: 中。数値は HoYoWiki と wikiwiki で一致)
- 基本情報: id `claretta` / nameJa クラレッタ / nameEn **Claret Flint**(公式英名) / S / electric / 役割 **鋭御(Armorer、新役割)** / 陣営 ロスカリファ・フリンツ工房 / 音動機 深紅の渇望(Crimson Thirst) / Ver.3.2 / https://wiki.hoyolab.com/pc/zzz/entry/1185
- 収録候補 9 件(全て target: self):

| id | stat | 値 |
|---|---|---|
| claretta_core_crit_rate | crit_rate | base 30(コアLv7) |
| claretta_core_dmg_pct | dmg_pct | base 15 |
| claretta_add_ability_decibel | decibel_gain | base 300 |
| claretta_m2_res_ignore_electric | enemy_res_down_pct(electric) | m2 18 |
| claretta_m4_basic_dmg / _chain_dmg / _ult_dmg | basic/chain/ult_dmg_pct | m4 20(通常は鍛星3段目のみ) |
| claretta_wengine_crit_rate | crit_rate | P1〜P5: 25/27.5/30/32.5/35 |
| claretta_wengine_electric_dmg | dmg_pct_element(electric) | P1〜P5: 15/17.5/20/**23**/25(P4 は HoYoWiki 表記どおり。等差なら 22.5) |

- 未収録候補 14 件のうち stat 新設で収録できるもの: 追加能力「残鋭」暴傷ダメージ+25%([鋭御]メンバー全員、40秒、チームバフ)、音動機「渇血」電気属性鋭撃ダメージ+10/11.5/13/14.5/16%(与ダメとは別枠乗算)。残りは変換式・リソース・倍率・被ダメ軽減など(report の C 表参照)。

### T-2 クレタのポテンシャル解放(確信度: 中。根拠は wikiwiki のみ、HoYoWiki ja/en 未反映)
- 収録候補 5 件(全て新規 buff、既存 buff の値変化なし):

| id | stat | target | 値 |
|---|---|---|---|
| koleda_potential_team_dmg | dmg_pct | team | t1 35(40s、溶炉昇温消費時) |
| koleda_potential_team_crit_dmg | crit_dmg | team(鋭御以外) | t2〜t6: 11/17/23/29/35(永続) |
| koleda_potential_basic2_dmg_self | basic_dmg_pct | self | t1 10 ×2重 |
| koleda_potential_basic2_daze_self | daze_pct | self | t1 20 ×2重 |
| koleda_potential_ex_quick_daze_self | daze_pct | self | t1 10 |

- 既存 buff の note 追記: koleda_additional_team_chain_dmg の発動条件に[鋭御]が追加(値は不変)
- stat 新設で収録できるもの: 発破作業の[鋭御]向け暴傷ダメージ+4/6/8/10/12%(t2〜t6)
- 未収録 8 件: 強化通常の2段化、溶炉昇温2重保持、自動2段目、無敵、中断耐性、派生ルート、長押し爆発、追加能力条件緩和(report の C 表参照)
- 別件の気づき: 既存 koleda_core_daze_self が base 30(コアLv1相当)。他キャラはコアLv7 の値で収録しているため 60 が正しい可能性 → unresolved.md にメモ(Non-goal、今回は修正しない)

## 決めてほしいこと(レビューゲート)

| ID | 論点 | 推奨(既定) | 代替 |
|---|---|---|---|
| D1 | 新役割「鋭御」の扱い | `armorer` を RoleSchema / Role 型 / ROLE_LABEL に追加(3ファイル、UI はラベル経由なので変更不要) | 暫定 `attack`(誤った役割になるため非推奨) |
| D2 | 新 stat の追加 | `sharp_crit_dmg`「暴傷ダメージ」と `sharp_dmg_pct`「鋭撃ダメージ」を stats.ts に追加し、クラレッタ追加能力(team, condition.roles: [armorer])・音動機・クレタ発破作業(鋭御向け)を収録 | 追加せず unresolved.md 行き |
| D3 | クラレッタの陣営 | `ros_khalifa`(labels.ts のコメント「局などの下部組織を含む」に従う) | `flint_workshop`「フリンツ工房」を新設 |
| D4 | クレタ発破作業の会心DMG「鋭御以外」の表現 | condition に役割除外が無いため note で記載(クラレッタ行にも表示される) | schema に `excludeRoles` を追加(UI/applicability 変更を伴うため今回は非推奨) |
| D5 | 音動機 P4 の 23 vs 22.5 | HoYoWiki 表記 23 を採用し note に要確認と記載 | 22.5 に補正 |
| D6 | 自バフ(クレタ potential の self 3件) | 既存慣例どおり収録 | 落とす |

## 実行ログ / リプラン履歴

- 2026-09-24 ユーザー承認(修正あり): D1 承認+鋭御の有効/無効ステータス指定(有効: 防御力/会心率/暴傷DMG/DMG/属性DMG、無効: 攻撃力/HP系/会心DMG/透徹系)、D2 は暴傷ダメージのみ追加(「鋭撃ダメージ」は表記ゆれ扱い → 音動機の電気属性鋭撃DMGは unresolved.md へ)、暴傷DMG 列は透徹DMG の右、D3〜D5 既定値で承認
- 2026-09-24 実行: T-2b〜T-5 反映。V-1 validate-data OK(characters 58 = +1、buffs 498)。V-2 npm test 50/50 pass(鋭御の applicability テスト 2 件追加)。V-3 node 抽出で claretta エントリ・koleda hasPotential・potential 付き 6 件が収集結果と一致。V-4 HoYoWiki text(1185/1189)で コア会心率30/与ダメ15/デシベル300/残鋭25%/M2 耐性18%無視/M4 20%/音動機値、wikiwiki クレタで 発破作業 4〜12 / 11〜35 を突合、一致。V-5 grep で potential.md(koleda 行・未収録 8 件)/unresolved.md(claretta 3 行・koleda 疑義 1 行)を確認。V-6 Playwright 8/8 PASS(クラレッタ行・鋭御ラベル・暴傷DMG 列・+25%、クレタ T0→T6 で 与DMG +35% / 会心DMG +35% / 暴傷DMG +12%、ページエラーなし)。npm run build 成功
- 2026-09-24 explainer 生成: explainer/claretta-koleda-potential/index.html(validate PASSED)。git 管理外(.gitignore 既定)
- 2026-09-24 T-1/T-2 完了(Opus 並列)。レビューゲートで停止、D1〜D6 の承認待ち
- 2026-09-24 作成。T-1/T-2 は仕様確定のための調査であり、レビューゲート前に実行する(結果を見ないと AC-2/AC-3 の具体値が定まらないため)

## クローズチェックリスト

- [x] すべての検証手段（V-*）を実際に実行し、結果を実行ログに記録した
- [x] 完了条件（AC-*）ごとに達成を確認した（未達成があれば区別して報告した）
- [x] ユーザーに完了報告した
- [x] WIP の扱い(保持)（保持/削除）をプロジェクト方針に従って処理した

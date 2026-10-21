# WIP: フィオニー(Ver.3.3)を追加

- 作成日: 2026-10-20
- status: done <!-- planning / in-progress / blocked / done -->
- 元の依頼: v3.3 で実装されるフィオニーについて data フォルダに画像を格納したので内容を読み取って追加。所属はクランプスの黒枝、炎の S 級異常エージェント。曖昧な点は先に確認
- 適用: 軽量(データのみ、1 キャラ分。ロクシー初回追加 48541e4 と同じ画像根拠パターン)
- 追加指示: `data/` は git 管理外にする(.gitignore に追加)

## 根拠

- 画像: `data/v3.3_フィオニー/`(先行体験動画のゲーム内画面「創作体験ver」、スキル 18 枚・心象映画 4 枚・音動機 1 枚)
- HoYoWiki entry 1201(フィオニー・レファエラ / Phoenix Reffaella): 陣営・属性・特性・英名のみ掲載、スキル本文・ステータス・音動機は未掲載(2026-10-20 時点)
- ユーザー回答(2026-10-20): 追加能力の効果は「炎蝕状態の敵が受ける状態異常ダメージの会心ダメージ+15%」。基礎ステータスは仮置きで通す。音動機の「次の段階」は P5 として線形補間

## 読み取り結果と収録判断

| 項目 | 原文(要約) | 収録 |
|------|-----------|------|
| 基本 | S / 炎 / 異常 / クランプスの黒枝 / パリィ支援「長患いの知恵」/ 音動機「転生の炎翼」 | characters.json |
| コア | 異常マスタリー+85 | anomaly_proficiency self 85 |
| コア | 任意のメンバーの状態異常ダメージで敵が「炎蝕」(20s)。炎蝕状態の敵が受ける状態異常ダメージが会心(基礎会心率 30%、会心 DMG 25%)。開幕異常掌握 155 超過 1Pt ごとに会心率+0.7%、255 で最大 | anomaly_crit_rate team 100(上限値)、anomaly_crit_dmg team 25。modes は anomaly/abloom/disorder |
| コア | 炎蝕の敵に 8 秒ごとに攻撃力 50% の炎ダメージ、業火/不犯/リザレクション | 倍率・固有リソース・回復のため未収録 |
| 追加能力 | 炎蝕状態の敵が受ける状態異常ダメージの会心ダメージ+15%(他の[異常] / 同陣営) | anomaly_crit_dmg team 15 |
| M1 | 入場時「昇焔」1Pt、炎蝕の異常会心 DMG+25%、焦熱攻撃の業火獲得+15% | anomaly_crit_dmg team m1 25(他は未収録) |
| M2 | 熱傷の継続+2 秒、炎蝕状態の敵に与えるダメージ+30% | dmg_pct self m2 30(時間延長は未収録) |
| M4 | 終結/通常長押しのとどめで狂咲を追加 1 回(倍率 600%) | 未収録(倍率) |
| M6 | 全属性耐性 15% 無視、灼焔で昇焔 1Pt、狂咲の防御力 40% 無視 | enemy_res_ignore_all_pct self m6 15、enemy_def_down_pct self modes abloom m6 40 |
| 音動機 | 異常マスタリー+90 / 任意のメンバーの状態異常ダメージが会心した時、装備者の炎ダメージ+40%(20s)。次の段階 126 / 56% | P1〜P5 = 90/99/108/117/126、40/44/48/52/56(線形補間、ユーザー指示) |
| M3 / M5 | 画像なし(スキルレベルと推定) | 未収録 |

## 完了条件と検証

| ID | 完了条件 | 検証 |
|----|----------|------|
| AC-1 | characters.json にフィオニー(id `fionne`)が追加され、追加能力の activation(sameFaction + roles anomaly)が conditionShort の 2 項目と一致する | `npm run validate-data` が OK |
| AC-2 | buffs/fionne.json に上表の 10 件が収録され、全件に sourceUrl(entry 1201)と画像根拠の note がある | `npm run validate-data` / 目視 |
| AC-3 | agent_stats.json に仮置きエントリがあり validate を通る。仮置きである旨が unresolved.md に記載 | `npm run validate-data` / 目視 |
| AC-4 | `data/` が git 管理外 | `git status --short` に `data/` が出ない |
| AC-5 | テストとビルドが通る | `npm test` / `npm run build` |

## TODO

| # | 内容 | AC | status |
|---|------|----|--------|
| 1 | .gitignore に data/ を追加 | AC-4 | done |
| 2 | characters.json にフィオニーを追加 | AC-1 | done |
| 3 | buffs/fionne.json を作成 | AC-2 | done |
| 4 | agent_stats.json に仮置き(バーニスの基礎値流用、音動機は画像の攻撃力 713 / 異常掌握 30%) | AC-3 | done |
| 5 | unresolved.md にフィオニー行を追加 | AC-2, AC-3 | done |
| 6 | validate-data / test / build を実行 | AC-1〜5 | done |

## オーケストレーションパス

self のみ、直列。委譲なし。

## 実行ログ

- 2026-10-20 画像 23 枚を読み取り、HoYoWiki entry 1201 を API で確認(本文未掲載)。ユーザーに 3 点確認して回答取得
- 2026-10-20 データ追加。`.gitignore` の `data/` が `src/data/` にも一致し buffs/fionne.json が無視されたため `/data/`(ルート限定)に修正
- 2026-10-20 検証: `npm run validate-data` OK(characters 61 / buffs 593)、`npm test` 121 件 pass、`npm run build` 成功、`git status` で `data/` は非表示・`src/data/buffs/fionne.json` は untracked として表示(AC-1〜5 達成)

## クローズチェックリスト

- [x] V-x を全件実行し結果を記録
- [x] AC-x ごとに達成を確認
- [x] 未収録・仮置きを unresolved.md に記録(基礎ステータス・音動機 P2〜P4 と英名・心象映画名・M3/M5)
- [ ] HoYoWiki entry 1201 反映後に再照合(別タスク)

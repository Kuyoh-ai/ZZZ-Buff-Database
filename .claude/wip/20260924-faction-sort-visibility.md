# WIP: 既定ソート順(陣営>Ver.>名前)、陣営色帯、レアリティチップ、アタッカーのカスタムドロップダウン

- 作成日: 2026-09-24
- status: done <!-- planning / in-progress / blocked / done -->
- 元の依頼: エージェントのデフォルトソート順とアタッカーリストのソート順の改善と、リストの視認性改善。ソート順は 所属陣営 > Ver. > 名前順。陣営の順番は 邪兎屋 ヴィクトリア家政 白祇重工 カリュドーンの子 防衛軍･ｵﾎﾞﾙｽ小隊 防衛軍･ｼﾙﾊﾞｰ小隊 対ホロウ六課 治安局･特務捜査班 治安局･都市秩序部 ｽﾀｰｽﾞ･ｵﾌﾞ･ﾘﾗ モッキンバード 雲嶽山 怪啖屋 クランプスの黒枝 妄想エンジェル パエトーン ﾛｽｶﾘﾌｧ･外務計策局 ﾛｽｶﾘﾌｧ･空域巡警局 ダアト結社。Ver. は wikiwiki エージェント一覧から取得(クラレッタは 3.2)。左端に所属に合わせた色帯(色は wiki の陣営列)。A/S の文字を平行四辺形のチップにし [A級] [S級] 表記、A級は濃いピンク、S級は黄金色、トーンは UI に揃える。
- 質問への回答(2026-09-24): 陣営は細分化しつつ 防衛軍/治安局/ロスカリファ の大区分を維持し、同陣営判定は大区分で行う / Ver. 昇順・名前 50音順 / アタッカーリストはカスタムドロップダウンに作り替える / 表記は「怪啖屋」に変更

## Goal（大目標）

テーブルの既定順とアタッカー選択肢の順が「陣営(指定順) > Ver.(昇順) > 名前(50音)」になり、各行の左端に陣営色の帯、レアリティが平行四辺形の [S級](黄金)/[A級](濃ピンク) チップで表示され、アタッカー選択が色帯・チップ付きのカスタムドロップダウン(キーボード操作可)になる。陣営は 19 の細分 ID で持ち、同陣営判定とフィルタの大区分(防衛軍/治安局/ロスカリファ)を維持する。

## Non-goals（やらないこと）

- バフ数値・note の変更
- 列(stat)の順序変更、列ソートの挙動変更(クリック時は従来どおり。既定順はソートキーが空のときのみ)
- 陣営色以外の配色変更、アニメーションの変更
- 英語 UI

## 設計(確定)

- **陣営定義** `src/data/labels.ts`: `FACTIONS: { id, label, group, color }[]` を指定順で定義(19 件)。`FACTION_LABEL` / `FACTION_ORDER`(id→index) / `FACTION_GROUP`(id→大区分 id) / `FACTION_COLOR` / `FACTION_GROUP_LABEL` を導出。
  - ID: cunning_hares(邪兎屋) / victoria_housekeeping / belobog_heavy_industries / sons_of_calydon / defense_force_obol(防衛軍･オボルス小隊) / defense_force_silver(防衛軍･シルバー小隊) / hollow_special_operations(対ホロウ六課) / neps_special_investigation(治安局･特務捜査班) / neps_public_order(治安局･都市秩序部) / stars_of_lyra / mockingbird / yunkui_summit / spook_shack(怪啖屋) / krampus_compliance_authority / angels_of_delusion / phaethon / ros_khalifa_foreign_affairs(ロスカリファ･外務計策局) / ros_khalifa_airspace(ロスカリファ･空域巡警局) / covenant_of_dayat
  - 大区分: defense_force = {obol, silver}、new_eridu_public_security = {special_investigation, public_order}、ros_khalifa = {foreign_affairs, airspace}。他は自分自身
  - 色: wiki のカラーチップ(邪兎屋 #ff498c、白祇重工 #d4d4d4、カリュドーンの子 #bc3d29、モッキンバード #aa11cc、怪啖屋 #d54553、妄想エンジェル #f7509c、ヴィクトリア家政 #404049、特務捜査班 #0d75d9、都市秩序部 #c9a97b、六課 #22bdcc、オボルス #e9d278、シルバー #f0a65c、雲嶽山 #ffbf16、クランプス #716dff、リラ #e14a3f、空域巡警局 #2776f9、外務計策局 #185aca、パエトーン #ffe482、ダアト #b9adad)
- **キャラデータ**: `faction` を細分 ID に移行(旧 obol_squad → wiki どおり soldier_0_anby のみ silver、他 4 体は obol / new_eridu_public_security → cissia のみ public_order、他は special_investigation / ros_khalifa → sigrid は airspace、norma・velina・claretta は foreign_affairs)。前半/後半(releasePhase)は記録しない(ユーザー回答)
- **同陣営判定** `applicability.ts`: `condition.factions` の各 ID(細分 or 大区分)について `FACTION_GROUP[attacker.faction] === FACTION_GROUP[f] ?? f` で一致
- **validate-data**: faction と condition.factions は「細分 ID または大区分 ID」を許可
- **既定ソート** `sort.ts`: `defaultOrder(a, b)` = FACTION_ORDER → Ver. 数値昇順 → nameJa localeCompare("ja")。App の `sorted` はソートキー空のときこれを使う。「陣営」列ソートも FACTION_ORDER 基準。CHARACTERS 自体は既定順で並べ替えた配列にし、アタッカー候補も同順
- **色帯**: 行の名前セルに `border-left: 4px solid var(--fac)`(inline で `--fac` に陣営色)。自己行マーカー(inset 3px orange)は帯と競合するため、行背景の橙ティント + 名前の橙色に変更
- **レアリティチップ**: `.rarity` を平行四辺形(skewX(-12deg)、内側の文字は逆 skew)にし、表示は「S級」「A級」。色は tokens に `--gold: #f2c94c` / `--pink: #ff3f8e` を追加(UI の彩度・明度に合わせる)。テーブル、アタッカーカード、ドロップダウンで共通
- **アタッカー ドロップダウン** `AttackerPicker.tsx`: select を button(現在値表示)+ listbox(role="listbox"/"option")に置換。候補は既定順、各行に色帯・[S級]チップ・名前・属性・役割。矢印キーで移動、Enter/Space で決定、Esc で閉じる、外側クリックで閉じる、先頭に「指定なし」。`data-testid`: attacker-toggle / attacker-list / attacker-opt-<id> / attacker-opt-none

## 完了条件

| ID | 完了条件 | 検証手段 |
|------|----------|----------|
| AC-1 | labels.ts に 19 陣営が指定順で定義され、全キャラの faction が細分 ID になり、validate-data を通る。旧 ID(obol_squad/new_eridu_public_security/ros_khalifa/defense_force)は characters.json に残らない | V-1, V-3 |
| AC-2 | 同陣営判定: condition.factions に大区分 ID を指定したとき、その配下の細分陣営のアタッカーに適用され、細分 ID 指定時は同じ大区分の別細分にも適用される(大区分単位) | V-2 |
| AC-3 | 既定順(ソートキー空)が 陣営指定順 > Ver.昇順 > 名前50音 になり、列ソートを解除すると既定順に戻る。「陣営」列ソートは指定順に従う | V-2, V-4 |
| AC-4 | 各行の名前セル左端に陣営色の帯が出て、色が labels.ts の定義と一致する。アタッカー選択中の自己行は帯を保ったまま識別できる | V-4 |
| AC-5 | レアリティが「S級」(黄金)/「A級」(濃ピンク)の平行四辺形チップで、テーブル・アタッカーカード・ドロップダウンに表示される | V-4 |
| AC-6 | アタッカー選択がカスタムドロップダウンになり、候補が既定順、色帯・チップ付き、キーボード(↑↓ Enter Esc)とマウスで選択でき、解除で指定なしに戻る | V-4 |
| AC-7 | 既存テスト・validate-data・build・e2e が全て通る | V-1, V-2, V-4 |

## 検証手段

| ID | 何を | どう確認するか | 期待結果 |
|-----|------|----------------|----------|
| V-1 | スキーマ・陣営 ID | `npm run validate-data` | OK、characters 59、unknown faction なし |
| V-2 | ユニット | `npm test`。追加: sort.test(defaultOrder: 陣営順→Ver.→名前、入力非破壊、未知陣営は末尾)、applicability.test(大区分の同陣営判定 3 ケース)、labels の 19 件・順序・大区分の整合テスト | 全件 pass、追加 6 件以上 |
| V-3 | データ | `node -e` で faction ごとの人数と旧 ID の残存を出力 | 旧 ID 0 件、19 陣営に配分(wiki の一覧と一致) |
| V-4 | 画面(e2e) | `npm run dev` 後 `python scripts/e2e.py`。追加: 初期の先頭 5 行が anby, billy, nekomata, nicole, starlight_billy(邪兎屋の Ver.→名前順)/ ソート解除で同順に戻る / 各行 `.td--name` の border-left 色が定義と一致(3 行サンプル)/ `.rarity` のテキストが「S級」「A級」/ attacker-toggle クリック→ attacker-opt-ellen クリックで選択、既存の「attacker highlight」検査が通る / キーボード: toggle に focus して ArrowDown×2 → Enter で 2 番目候補が選ばれる / Esc で閉じる | 既存+追加 すべて PASS、ページエラーなし |

## TODO

| ID | 内容 | 完了条件 | 担当 | モデル | status |
|-----|------|----------|------|--------|--------|
| T-1 | wikiwiki エージェント一覧から陣営(細分)・Ver.(X.YZ)・陣営色を抽出(scratchpad/agent-list.json) | AC-1 | subagent | opus | done |
| T-2 | labels.ts の FACTIONS 定義(順序・大区分・色)、validate-data の大区分許可、applicability の大区分判定 + テスト | AC-1, AC-2 | self | - | done |
| T-3 | characters.json の faction 移行(T-1 の結果から) | AC-1 | self | - | done |
| T-4 | sort.ts に defaultOrder + テスト、App の既定順・陣営列ソート・CHARACTERS 並び | AC-3 | self | - | done |
| T-5 | 色帯・自己行マーカー変更・レアリティチップ(BuffTable, CSS, tokens) | AC-4, AC-5 | self | - | done |
| T-6 | AttackerPicker をカスタムドロップダウンに置換(CSS 含む) | AC-6 | self | - | done |
| T-7 | e2e 更新(attacker 操作の置換、既定順・色帯・チップ・キーボード) | AC-7 | self | - | done |
| T-8 | V-1〜V-4 全件実行、README(陣営規約)とメモリ(陣営表記)更新 | AC-7 | self | - | done |

## オーケストレーションパス

```
T-1(抽出/Opus、完了)
   ↓
T-2 → T-3 → T-4 → T-5 → T-6 → T-7 → T-8   (self、直列: 定義→データ→ロジック→UI→e2e→検証)
```

## 実行ログ / リプラン履歴

- 2026-09-24 ユーザー承認(Q-1/Q-3 既定値、Q-2 は前半/後半を記録しない)。Phase 5 開始
- 2026-09-24 作成。T-1 は質問と並行して先行実行し完了(58/59 対応、クラレッタは一覧未掲載、Ver. 相違 0)

- 2026-09-24 実行: T-2〜T-7 反映(labels.ts の FACTIONS 19 件、validate-data の大区分許可、applicability の大区分判定、characters.json 移行、sort.ts defaultOrder、load.ts で既定順、App の陣営列ソート/フィルタ順、BuffTable の色帯+RarityChip、AttackerPicker のカスタム listbox、CSS/tokens(--gold/--pink)、e2e 更新、README)。
- 2026-09-24 検証: V-1 validate-data OK(59 体、unknown faction なし)。V-2 npm test 67/67(追加 9 件: labels 3、applicability 3、sort 3)。V-3 19 陣営に配分(wiki 一覧と一致: シルバー小隊=0号のみ、都市秩序部=シーシィアのみ、空域巡警局=シグリッドのみ)、旧 ID 0 件。V-4 e2e 39/39 PASS(追加 11 項目: 既定順、ソート解除で既定順、色帯 3 色、チップ文言、カード/リストのチップ、キーボード操作、Esc)。npm run build 成功。スクリーンショットで色帯・チップ・ドロップダウンを目視確認。
- 2026-09-24 制約: 名前順は localeCompare("ja") のため、かな → 漢字の順になり漢字名は読み順にならない(同陣営・同 Ver. 内のみ影響)。読み仮名(nameKana)を持たせれば解消可能。e2e の既定順の期待値はこの挙動に合わせた
- 2026-09-24 メモリ更新: zzz-data-conventions に陣営細分化・怪啖屋・大区分判定を反映

- 2026-09-24 追加指示: クラレッタは「ロスカリファ・フリンツ工房」(ros_khalifa_flint_workshop、大区分 ros_khalifa)として 20 番目の陣営を追加(空域巡警局の後ろ)。wiki 一覧に色が無いため #5fa8ff を仮置き。validate-data / test / build を再実行

- 2026-09-24 修正: アタッカーのリストが .panel の clip-path で切られていたため、createPortal で body 直下に fixed 配置(ボタン位置から算出、resize/scroll で追従、最大高さは表示領域内)。tsc OK、e2e 39/39 PASS、展開時のリスト高さ 420px を目視確認

## クローズチェックリスト

- [x] すべての検証手段（V-*）を実際に実行し、結果を実行ログに記録した
- [x] 完了条件（AC-*）ごとに達成を確認した（未達成があれば区別して報告した）
- [x] ユーザーに完了報告した
- [x] WIP の扱い(保持)（保持/削除）をプロジェクト方針に従って処理した

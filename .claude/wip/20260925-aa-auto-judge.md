# WIP: アタッカー選択時に追加能力の発動可否を自動判定してチェックを切り替える

- 作成日: 2026-09-25
- status: done <!-- planning / in-progress / blocked / done -->
- 元の依頼: アタッカーのプルダウンが選択された場合に、追加能力の発動可否を自動判定してチェックを切り替える。自動設定後も手動で切り替え可。選択解除で元の状態に戻し、別のアタッカー選択時はそのアタッカー基準で再判定する

## Goal(大目標)

アタッカーを選ぶと、各キャラ(バフの出し手)の追加能力の発動条件を「出し手 + アタッカーの 2 人がチームにいる」前提で判定し、エージェント列 3 行目のチェックを自動で ON/OFF する。判定結果はブラウザ保存の設定(一括/個別)とは別の一時レイヤーに置き、解除で元に戻る。

## 実現性の検証結果

- 発動条件は 60 体すべて「同属性 / 同陣営 / [役割] / 他の[役割] / パリィ支援可能な他メンバー」の OR で表現できる(自由文 `condition` と `conditionShort` を確認)。構造化データは `conditionShort` から機械生成できる
- 「パリィ支援可能」(シーザー)は HoYoWiki の支援スキル名(「パリィ支援：〜」/「回避支援：〜」)で全キャラ判定可能。回避支援: billy, grace, pulchra, rina, zhu_yuan, astra。roxy は HoYoWiki 本文未掲載のため撃破の通例からパリィ支援と仮定(unresolved.md に記載)
- 制約: チームの 3 人目は不明なので、判定は「アタッカーだけで条件を満たすか」。満たさない場合は OFF にするが 3 人目次第で発動し得る(手動で ON にできる)

## Non-goals

- 3 人目のメンバー指定(チーム編成 UI)
- 自動判定結果の永続化(ブラウザ保存しない)
- バフ値・note の変更

## 設計(確定)

- **データ**: `characters.json` の `additionalAbility.activation?: { sameElement?, sameFaction?, roles?: Role[], parrySupport? }` と `Character.assist: "parry" | "evasive"` を追加。schema/types/validate-data(activation と conditionShort の項目数一致)を更新
- **判定**: `src/lib/activation.ts` の `judgeAdditionalAbility(buffer, attacker): boolean | null`(自分自身・activation 無しは null = 変更しない)。同陣営は大区分(`factionGroupOf`)、同属性は element/subElement の交差
- **状態**: App に `aaAuto: Record<id, boolean> | null`(非永続)。アタッカー選択で全キャラ分を再計算、解除で null。`effectiveSetting(settings, id, aaAuto)` が aaAuto を最優先で適用
- **手動変更**: アタッカー選択中の個別チェックは aaAuto を書き換える(永続設定は触らない)。一括 ON/OFF は永続設定と aaAuto の両方に適用。行リセット(↺)は永続の個別設定を消し、aaAuto をそのキャラの自動判定値に戻す
- **表示**: 自動判定中の行は `.aa--auto` とラベル末尾に「自動」バッジ、アタッカーカード下に説明文

## 完了条件

| ID | 完了条件 | 検証手段 |
|------|----------|----------|
| AC-1 | 全 60 体に `activation` と `assist` が入り validate-data を通る。activation の項目数が conditionShort の項目数と一致 | V-1 |
| AC-2 | `judgeAdditionalAbility` が 同属性/同陣営(大区分)/役割/パリィ支援 を正しく判定し、自分自身と activation 無しは null | V-2 |
| AC-3 | アタッカー選択で各行のチェックが判定どおりに切り替わり、解除で元(保存設定)に戻り、別アタッカーで再判定される | V-3 |
| AC-4 | アタッカー選択中に手動でチェックを変えられ、その状態は同じアタッカーの間は保持される | V-3 |
| AC-5 | 既存テスト・validate-data・build・e2e が全て通る | V-1〜V-3 |

## 検証手段

| ID | 何を | どう確認するか | 期待結果 |
|-----|------|----------------|----------|
| V-1 | スキーマ/整合 | `npm run validate-data` | OK、60 体 |
| V-2 | ユニット | `npm test`(activation.test / resolve.test 追加) | 全件 pass |
| V-3 | 画面 | `python scripts/e2e.py <out>`(エレン選択→ライカン ON/クレタ OFF/シーザー ON、ビリー選択→シーザー OFF、解除→クレタ ON、手動 ON の保持、再選択で再判定) | 全件 PASS |

## TODO

| ID | 内容 | status |
|-----|------|--------|
| T-1 | HoYoWiki ダンプから assist を判定し、conditionShort から activation を生成して characters.json に反映 | done |
| T-2 | types / schema / validate-data を更新 | done |
| T-3 | activation.ts と resolve.ts の一時レイヤー、テスト | done |
| T-4 | App / BuffTable / SettingsPanel / AttackerPicker の状態と表示、CSS | done |
| T-5 | e2e 追加、README・unresolved.md 更新、全検証 | done |

## 実行ログ

- 2026-09-25 作成。実現性検証で不足データなしと判断し、2 人基準の判定とロクシーのパリィ支援仮定を前提に実装
- 2026-09-25 ユーザー確認: 2 人基準の判定は想定どおり。クレタのポテンシャル解放(T1〜)で[鋭御]が条件に加わる仕様を `activation.potentialRoles` として追加し、出し手のポテンシャル設定(一括/個別)で判定・再判定するようにした(e2e 58 件 PASS)

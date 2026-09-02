# zzz-buff-database

ゼンレスゾーンゼロのキャラクターが与えるバフ/デバフ効果量を一覧するWebサイト(Vite + React + TypeScript、静的サイト)。

## 開発

- `npm run dev` 開発サーバー / `npm run build` ビルド / `npm test` ユニットテスト
- `npm run validate-data` データJSONのスキーマ検証 / `npm run check-anim` CSSアニメーション時間(0.5s以内)の検証

## データ

- キャラ基本情報: `src/data/characters.json`
- バフ/デバフ: `src/data/buffs/<characterId>.json`(各バフに `sourceUrl` 必須)
- ステータス定義: `src/data/stats.ts`

## WIP(作業計画)の規約

- 置き場所: `.claude/wip/<YYYYMMDD>-<task-slug>.md`
- 完了後も削除せず保持する
- `explainer/` はレビュー資料の生成先で git 管理外

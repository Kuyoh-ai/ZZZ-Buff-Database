import { z } from "zod";

/** ダメージ比較機能で使うデータ(agent_stats.json / enemies.json)のスキーマ。詳細は src/data/formula.md */

/** 敵の属性耐性キー(ゲーム内の 6 属性。流明/玄墨の対応は未確認のため含めない) */
export const RES_ELEMENTS = ["physical", "fire", "ice", "electric", "ether", "wind"] as const;
export type ResElement = (typeof RES_ELEMENTS)[number];

const pos = z.number().nonnegative();

export const AgentStatsSchema = z.object({
  nameJa: z.string().min(1),
  entryId: z.string().regex(/^\d+$/),
  sourceUrl: z.string().url(),
  level: z.literal(60),
  /** Lv60 の HP/攻撃/防御と、レベルで変化しない固定ステータス(衝撃力/会心率/会心ダメージ/異常掌握/異常マスタリー/貫通率/エネルギー自動回復/透徹力/暴傷ダメージ) */
  base: z
    .record(z.string(), pos)
    .refine((b) => ["hp", "atk", "def", "crit_rate", "crit_dmg"].every((k) => typeof b[k] === "number" && b[k] > 0), {
      message: "base must have positive hp/atk/def/crit_rate/crit_dmg",
    }),
  /** コアスキル強化ステータス(A〜F の合計) */
  core: z.record(z.string(), pos),
  wengine: z
    .object({
      nameJa: z.string().min(1),
      entryId: z.string().regex(/^\d+$/),
      baseStat: z.enum(["atk", "def", "hp"]),
      baseValue: z.number().positive(),
      advStat: z.string().min(1),
      advValue: z.number(),
      advLabelNote: z.string().optional(),
      sourceUrl: z.string().url(),
    })
    .optional(),
});
export type AgentStats = z.infer<typeof AgentStatsSchema>;
export const AgentStatsFileSchema = z.record(z.string().regex(/^[a-z0-9_]+$/), AgentStatsSchema);

export const EnemySchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  nameJa: z.string().min(1),
  nameEn: z.string().min(1),
  level: z.number().int().positive(),
  /** Lv70 時の防御力(敵防御は Lv60 以降上昇しない) */
  defLv70: z.number().positive(),
  /** 属性耐性%(弱点 -20 / 耐性 +20)。未記載は 0 */
  res: z.record(z.enum(RES_ELEMENTS), z.number()),
  /** ブレイク中の弱体倍率%(標準 150) */
  stunMultiplier: z.number().positive(),
  /** 弱体倍率の上限%(バフ加算後の合計をカット)。未指定なら上限なし */
  stunMultiplierMax: z.number().positive().optional(),
  /** 受ける状態異常ダメージの増減% */
  anomalyTakenPct: z.number(),
  versions: z.array(z.string().regex(/^\d+\.\d+$/)).optional(),
  note: z.string().optional(),
  sourceUrl: z.string().url(),
});
export type Enemy = z.infer<typeof EnemySchema>;
export const EnemiesFileSchema = z.object({ _comment: z.string().optional(), enemies: z.array(EnemySchema).min(3) });

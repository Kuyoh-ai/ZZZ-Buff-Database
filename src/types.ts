/** 属性 */
export type Element = "physical" | "fire" | "ice" | "electric" | "ether" | "auric_ink" | "wind" | "lumiflux";
/** 役割(特性) */
export type Role = "attack" | "stun" | "anomaly" | "support" | "defense" | "rupture";
export type Rarity = "S" | "A";

export interface Character {
  /** 英字snake_case。バフJSONのファイル名と一致させる */
  id: string;
  nameJa: string;
  nameEn: string;
  rarity: Rarity;
  element: Element;
  /** 霜烈(frost)・玄墨など複合属性の第二属性(任意) */
  subElement?: Element;
  role: Role;
  /** 陣営ID(snake_case)。ラベルは factions.ts */
  faction: string;
  /** モチーフ音動機 */
  wengine: { nameJa: string; nameEn: string };
  /** 実装バージョン(例 "1.0") */
  releaseVersion: string;
  /** ポテンシャル解放(6段階)が実装されているか */
  hasPotential?: boolean;
  /** キャラ一覧の参照元URL */
  sourceUrl: string;
}

/** バフの受け手 */
export type BuffTarget =
  | "self" // 自身のみ
  | "team" // チーム全員(自身含む。excludeSelfで除外)
  | "enemy" // 敵へのデバフ(全アタッカーに有効)
  | "next_swap_in"; // 次に登場するキャラ(自身以外)

export interface BuffCondition {
  /** 受け手の属性がいずれかに一致する必要がある */
  elements?: Element[];
  /** 受け手の陣営がいずれかに一致 */
  factions?: string[];
  /** 受け手の役割がいずれかに一致 */
  roles?: Role[];
  /** 自身を対象から外す */
  excludeSelf?: boolean;
}

/** 心象映画段階ごとの実効値。null/未定義は「前段階から変化なし」 */
export interface MindscapeValues {
  base: number;
  m1?: number | null;
  m2?: number | null;
  m3?: number | null;
  m4?: number | null;
  m5?: number | null;
  m6?: number | null;
}

/** ポテンシャル解放段階ごとの実効値。null/未定義は「前段階から変化なし」。心象映画の解決後に上書きする */
export interface PotentialValues {
  t1?: number | null;
  t2?: number | null;
  t3?: number | null;
  t4?: number | null;
  t5?: number | null;
  t6?: number | null;
}

/** モチーフ音動機装備時に加算される値(凸=phase 1〜5) */
export interface WengineValues {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
}

export interface Buff {
  id: string;
  name: string;
  stat: string;
  /** dmg_pct_element / enemy_res_down_pct など属性付きstatの対象属性 */
  element?: Element;
  target: BuffTarget;
  condition?: BuffCondition;
  /** 1スタックあたりの値 */
  values: MindscapeValues;
  wengine?: WengineValues;
  /** ポテンシャル解放で値が変わる/追加される場合 */
  potential?: PotentialValues;
  /** 最大スタック数(既定1) */
  maxStacks?: number;
  duration?: string;
  note?: string;
  sourceUrl: string;
}

export interface CharacterBuffs {
  characterId: string;
  buffs: Buff[];
}

export type Mindscape = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** 0 = 未装備 */
export type WenginePhase = 0 | 1 | 2 | 3 | 4 | 5;

export type Potential = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CharSetting {
  mindscape: Mindscape;
  wenginePhase: WenginePhase;
  /** ポテンシャル解放段階(未実装キャラでは無視) */
  potential: Potential;
}

export interface Settings {
  global: CharSetting;
  overrides: Record<string, Partial<CharSetting>>;
}

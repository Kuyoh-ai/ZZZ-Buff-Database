import type { AgentStats, Enemy } from "./calcSchema";
import agentStatsJson from "./agent_stats.json";
import enemiesJson from "./enemies.json";

/** ダメージ比較用データ。スキーマ検証は scripts/validate-data.ts で行う */
export const AGENT_STATS: Record<string, AgentStats> = agentStatsJson as unknown as Record<string, AgentStats>;
export const ENEMIES: Enemy[] = (enemiesJson as unknown as { enemies: Enemy[] }).enemies;
export const ENEMY_BY_ID: Record<string, Enemy> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

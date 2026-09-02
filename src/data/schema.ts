import { z } from "zod";
import { STAT_KEYS, STAT_BY_KEY } from "./stats";

export const ElementSchema = z.enum(["physical", "fire", "ice", "electric", "ether", "auric_ink", "wind", "lumiflux"]);
export const RoleSchema = z.enum(["attack", "stun", "anomaly", "support", "defense", "rupture"]);

export const CharacterSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  nameJa: z.string().min(1),
  nameEn: z.string().min(1),
  rarity: z.enum(["S", "A"]),
  element: ElementSchema,
  subElement: ElementSchema.optional(),
  role: RoleSchema,
  faction: z.string().min(1),
  wengine: z.object({ nameJa: z.string(), nameEn: z.string() }),
  releaseVersion: z.string().regex(/^\d+\.\d+$/),
  hasPotential: z.boolean().optional(),
  sourceUrl: z.string().url(),
});

const num = z.number().nullable().optional();

export const BuffSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    name: z.string().min(1),
    stat: z.string().refine((s) => STAT_KEYS.includes(s), { message: "unknown stat key" }),
    element: ElementSchema.optional(),
    target: z.enum(["self", "team", "enemy", "next_swap_in"]),
    condition: z
      .object({
        elements: z.array(ElementSchema).optional(),
        factions: z.array(z.string()).optional(),
        roles: z.array(RoleSchema).optional(),
        excludeSelf: z.boolean().optional(),
      })
      .optional(),
    values: z.object({ base: z.number(), m1: num, m2: num, m3: num, m4: num, m5: num, m6: num }),
    wengine: z.object({ p1: z.number(), p2: z.number(), p3: z.number(), p4: z.number(), p5: z.number() }).optional(),
    potential: z.object({ t1: num, t2: num, t3: num, t4: num, t5: num, t6: num }).optional(),
    maxStacks: z.number().int().positive().optional(),
    duration: z.string().optional(),
    note: z.string().optional(),
    sourceUrl: z.string().url(),
  })
  .superRefine((b, ctx) => {
    if (STAT_BY_KEY[b.stat]?.elemental && !b.element) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `stat ${b.stat} requires element` });
    }
  });

export const CharacterBuffsSchema = z.object({
  characterId: z.string(),
  buffs: z.array(BuffSchema),
});

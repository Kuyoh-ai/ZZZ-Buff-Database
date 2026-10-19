# HoYoWiki(ZZZ)の公開 API から全エージェントの Lv60 基礎ステータス・コアスキル強化ステータスと、
# モチーフ音動機の Lv60 基礎攻撃力・上級ステータスを取得して src/data/agent_stats.json を生成する。
# 実行: python scripts/fetch-agent-stats.py [出力 JSON パス]
#   characters.json / buffs/*.json に含まれる HoYoWiki の entry URL からエージェントのエントリを特定し、
#   エントリ内の「モチーフ音動機」リンクから音動機エントリを辿る。
import sys, os, io, json, re, time, html
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "src/data/agent_stats.json")
API = "https://sg-act-public-api.hoyolab.com/hoyowiki/zzz/wapi"
API_STATIC = "https://sg-act-public-api-static.hoyolab.com/hoyowiki/zzz/wapi"
HEADERS = {
    "x-rpc-wiki_app": "zzz",
    "x-rpc-language": "ja-jp",
    "referer": "https://wiki.hoyolab.com/",
    "origin": "https://wiki.hoyolab.com",
    "user-agent": "Mozilla/5.0",
    "content-type": "application/json",
}
# HoYoWiki の表記 → stat キー
AGENT_KEYS = {
    "HP": "hp", "攻撃力": "atk", "防御力": "def", "衝撃力": "impact",
    "会心率": "crit_rate", "会心ダメージ": "crit_dmg",
    "異常掌握": "anomaly_mastery", "異常マスタリー": "anomaly_proficiency",
    "貫通率": "pen_ratio", "エネルギー自動回復": "energy_regen",
    "透徹力": "sheer_force", "暴傷ダメージ": "sharp_crit_dmg",
    "アドレナリン自動回復": "adrenaline_regen", "シャープネス自動回復": "sharpness_regen",
}
CORE_KEYS = {
    "基礎衝撃力": "impact", "基礎エネルギー自動回復": "energy_regen", "HPパーセンテージ": "hp_pct", "攻撃力パーセンテージ": "atk_pct",
    "アドレナリン自動回復": "adrenaline_regen", "シャープネス自動回復": "sharpness_regen",
    "CRIT Rate increases": "crit_rate", "Base ATK increases": "atk", "CRIT DMG increases": "crit_dmg",
    "Anomaly Mastery increases": "anomaly_mastery", "Anomaly Proficiency increases": "anomaly_proficiency",
    "基礎攻撃力": "atk", "攻撃力": "atk", "基礎HP": "hp", "HP": "hp", "基礎防御力": "def", "防御力": "def",
    "衝撃力": "impact", "会心率": "crit_rate", "会心ダメージ": "crit_dmg",
    "異常掌握": "anomaly_mastery", "異常マスタリー": "anomaly_proficiency",
    "貫通率": "pen_ratio", "エネルギー自動回復": "energy_regen", "透徹力": "sheer_force", "暴傷ダメージ": "sharp_crit_dmg",
    "貫通値": "pen_flat", "アドレナリン": "adrenaline", "HP%": "hp_pct", "攻撃力%": "atk_pct", "防御力%": "def_pct",
}
WENGINE_ADV = {
    "攻撃力": "atk_pct", "会心率": "crit_rate", "会心ダメージ": "crit_dmg", "HP": "hp_pct", "防御力": "def_pct",
    "衝撃力": "impact_pct", "異常マスタリー": "anomaly_proficiency", "貫通率": "pen_ratio", "エネルギー自動回復": "energy_regen",
    "異常掌握": "anomaly_mastery_pct", "透徹力": "sheer_force_pct", "暴傷ダメージ": "sharp_crit_dmg",
}

_cache = {}


def call(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read().decode("utf8"))
    if d.get("retcode") != 0:
        raise RuntimeError(f"{url}: {d.get('retcode')} {d.get('message')}")
    return d["data"]


def page(eid):
    if eid not in _cache:
        _cache[eid] = call(f"{API_STATIC}/entry_page?entry_page_id={eid}")["page"]
        time.sleep(0.25)
    return _cache[eid]


def strip(s):
    s = re.sub(r"<[^>]+>", "", str(s))
    return html.unescape(s).strip()


def num(s):
    s = strip(s).replace("Pt", "").replace("+", "").replace(",", "").replace("/秒", "")
    if s in ("-", ""):
        return None
    m = re.match(r"-?\d+(\.\d+)?", s)
    return float(m.group(0)) if m else None


def components(pg, cid):
    for m in pg.get("modules", []):
        for c in m.get("components", []):
            if c.get("component_id") == cid:
                yield json.loads(c.get("data") or "{}")


def base_info(pg):
    out = {}
    for d in components(pg, "baseInfo"):
        for it in d.get("list", []):
            out[strip(it["key"])] = it["value"]
    return out


def ascension_rows(pg):
    for d in components(pg, "ascension"):
        return {r["key"]: {strip(cl["key"]).split("[")[0].strip(): cl["values"] for cl in r["combatList"]} for r in d["list"]}
    return {}


def agent_stats(pg):
    rows = ascension_rows(pg)
    lv1 = rows.get("1", {})
    lv60 = rows.get("60", {})
    stats, unknown = {}, []
    for src in (lv1, lv60):
        for k, vals in src.items():
            if k == "":
                continue
            if k not in AGENT_KEYS:
                unknown.append(k)
                continue
            v = num(vals[-1])
            if v is not None:
                stats[AGENT_KEYS[k]] = v
    core, unknown_core = {}, []
    for d in components(pg, "agent_talent"):
        for t in d.get("list", []):
            if t.get("title") != "コアスキル":
                continue
            for a in t.get("attributes", []):
                k = strip(a["key"])
                if k in ("天賦", "Core Skill") or "スキルレベル" in "".join(map(str, a["values"])):
                    continue
                if k not in CORE_KEYS:
                    unknown_core.append(k)
                    continue
                total = sum(x for x in (num(v) for v in a["values"]) if x is not None)
                core[CORE_KEYS[k]] = round(core.get(CORE_KEYS[k], 0) + total, 2)
    return stats, core, unknown + unknown_core


def wengine_stats(pg):
    rows = ascension_rows(pg)
    lv60 = rows.get("60", {})
    bi = base_info(pg)
    adv_label = strip(bi.get("上級ステータス", [""])[0])
    base_label = strip(bi.get("基礎ステータス", ["基礎攻撃力"])[0])
    out = {
        "nameJa": pg.get("name"), "entryId": str(pg.get("id")),
        "baseStat": {"基礎攻撃力": "atk", "基礎防御力": "def", "基礎HP": "hp"}.get(base_label, base_label), "baseValue": None,
        "advStat": WENGINE_ADV.get(adv_label, adv_label), "advValue": None,
    }
    for k, vals in lv60.items():
        if k == base_label:
            out["baseValue"] = num(vals[-1])
        elif k and k != "音動機改造":
            # 上級ステータスの行(baseInfo の表記と食い違うことがあるので「基礎以外の行」を採用)
            out["advValue"] = num(vals[-1])
            if k != adv_label:
                out["advLabelNote"] = f"突破表の表記は「{k}」(baseInfo は「{adv_label}」)"
    return out


def entry_ids_of(ch):
    ids = []
    urls = [ch.get("sourceUrl", ""), (ch.get("additionalAbility") or {}).get("sourceUrl", "")]
    bp = os.path.join(ROOT, "src/data/buffs", f"{ch['id']}.json")
    if os.path.exists(bp):
        urls += [b.get("sourceUrl", "") for b in json.load(open(bp, encoding="utf8"))["buffs"]]
    for u in urls:
        m = re.search(r"hoyolab\.com/pc/zzz/entry/(\d+)", u)
        if m and m.group(1) not in ids:
            ids.append(m.group(1))
    return ids


chars = json.load(open(os.path.join(ROOT, "src/data/characters.json"), encoding="utf8"))
result = {}
for i, ch in enumerate(chars):
    agent_pg = None
    for eid in entry_ids_of(ch):
        pg = page(eid)
        if pg.get("menu_name") == "エージェント" or "agent_talent" in [c["component_id"] for m in pg["modules"] for c in m["components"]]:
            agent_pg = pg
            break
    if not agent_pg:
        print(f"[{i+1}/{len(chars)}] {ch['id']}: agent entry NOT FOUND")
        continue
    stats, core, unknown = agent_stats(agent_pg)
    bi = base_info(agent_pg)
    rec = {
        "nameJa": agent_pg.get("name"),
        "entryId": str(agent_pg.get("id")),
        "sourceUrl": f"https://wiki.hoyolab.com/pc/zzz/entry/{agent_pg.get('id')}",
        "level": 60,
        "base": stats,
        "core": core,
    }
    m = re.search(r'"ep_id":(\d+)', "".join(map(str, bi.get("モチーフ音動機", []))))
    if m:
        w = wengine_stats(page(m.group(1)))
        w["sourceUrl"] = f"https://wiki.hoyolab.com/pc/zzz/entry/{m.group(1)}"
        rec["wengine"] = w
    result[ch["id"]] = rec
    print(f"[{i+1}/{len(chars)}] {ch['id']} ({agent_pg.get('name')}) atk={stats.get('atk')} core={core} wengine={rec.get('wengine',{}).get('nameJa')} {rec.get('wengine',{}).get('baseStat')}={rec.get('wengine',{}).get('baseValue')} {rec.get('wengine',{}).get('advStat')}={rec.get('wengine',{}).get('advValue')}" + (f"  UNKNOWN KEYS: {unknown}" if unknown else ""))

json.dump(result, open(OUT, "w", encoding="utf8"), ensure_ascii=False, indent=2)
print(f"wrote {OUT}: {len(result)} agents")

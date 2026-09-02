# HoYoWiki(ZZZ)の公開APIからエージェント/音動機のエントリ一覧と本文(JSON)を取得して保存する。
# 実行: python scripts/fetch-hoyowiki.py [出力ディレクトリ] [lang]
#   lang: ja-jp(既定) / en-us
# 出力:
#   <outdir>/index.json            … {menu: [{id, name}]} 一覧
#   <outdir>/entries/<id>.json     … entry_page API の生JSON
#   <outdir>/text/<id>.txt         … modules を展開した読みやすいテキスト(名前/スキル/心象映画など)
import sys, os, io, json, re, time, html
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8")
out = sys.argv[1] if len(sys.argv) > 1 else "hoyowiki-dump"
lang = sys.argv[2] if len(sys.argv) > 2 else "ja-jp"
MENUS = {"8": "agents", "11": "wengines"}
API = "https://sg-act-public-api.hoyolab.com/hoyowiki/zzz/wapi"
API_STATIC = "https://sg-act-public-api-static.hoyolab.com/hoyowiki/zzz/wapi"
HEADERS = {
    "x-rpc-wiki_app": "zzz",
    "x-rpc-language": lang,
    "referer": "https://wiki.hoyolab.com/",
    "origin": "https://wiki.hoyolab.com",
    "user-agent": "Mozilla/5.0",
    "content-type": "application/json",
}


def call(url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method="POST" if body is not None else "GET")
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read().decode("utf8"))
    if d.get("retcode") != 0:
        raise RuntimeError(f"{url}: {d.get('retcode')} {d.get('message')}")
    return d["data"]


def list_menu(menu_id):
    items, page = [], 1
    while True:
        d = call(f"{API}/get_entry_page_list", {"filters": [], "menu_id": menu_id, "page_num": page, "page_size": 30, "use_es": True})
        lst = d.get("list") or []
        items += [{"id": x["entry_page_id"], "name": x["name"], "icon": x.get("icon_url"), "filters": x.get("filter_values")} for x in lst]
        if len(lst) < 30:
            break
        page += 1
        time.sleep(0.3)
    return items


def strip_html(s):
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


def render(page):
    lines = [f"# {page.get('name')}  (entry {page.get('id')}, menu {page.get('menu_name')})", ""]
    for m in page.get("modules", []):
        lines.append(f"\n## {m.get('name')}")
        for comp in m.get("components", []):
            try:
                data = json.loads(comp.get("data") or "{}")
            except Exception:
                data = {"raw": comp.get("data")}
            lines.append(f"### [{comp.get('component_id')}]")
            lines.append(dump(data))
    return "\n".join(lines)


def dump(x, depth=0):
    pad = "  " * depth
    if isinstance(x, dict):
        outl = []
        for k, v in x.items():
            if k in ("icon_url", "img", "image", "images", "icon", "url", "video", "background", "bg"):
                continue
            if isinstance(v, (dict, list)):
                outl.append(f"{pad}{k}:")
                outl.append(dump(v, depth + 1))
            else:
                sv = strip_html(str(v)) if isinstance(v, str) else str(v)
                if sv:
                    outl.append(f"{pad}{k}: {sv}")
        return "\n".join(outl)
    if isinstance(x, list):
        return "\n".join(dump(v, depth) if isinstance(v, (dict, list)) else f"{pad}- {strip_html(str(v))}" for v in x)
    return pad + strip_html(str(x))


os.makedirs(os.path.join(out, "entries"), exist_ok=True)
os.makedirs(os.path.join(out, "text"), exist_ok=True)
index = {}
for mid, name in MENUS.items():
    index[name] = list_menu(mid)
    print(f"{name}: {len(index[name])} entries")
json.dump(index, open(os.path.join(out, "index.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)

todo = [e for lst in index.values() for e in lst]
for i, e in enumerate(todo):
    jp = os.path.join(out, "entries", f"{e['id']}.json")
    if not os.path.exists(jp):
        try:
            page = call(f"{API_STATIC}/entry_page?entry_page_id={e['id']}")["page"]
            json.dump(page, open(jp, "w", encoding="utf8"), ensure_ascii=False, indent=1)
            open(os.path.join(out, "text", f"{e['id']}.txt"), "w", encoding="utf8").write(render(page))
            print(f"[{i+1}/{len(todo)}] {e['name']} ({e['id']})")
        except Exception as ex:
            print(f"[{i+1}/{len(todo)}] {e['name']} FAILED: {ex}")
        time.sleep(0.25)
print("done")

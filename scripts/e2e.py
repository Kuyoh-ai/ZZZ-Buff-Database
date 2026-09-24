# V-6: UI操作の検証(Playwright)。開発サーバーが http://localhost:5173 で起動している前提。
# 実行: python scripts/e2e.py [出力ディレクトリ]
import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8")
from playwright.sync_api import sync_playwright

out = sys.argv[1] if len(sys.argv) > 1 else "e2e-out"
os.makedirs(out, exist_ok=True)
results = []

def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1600, "height": 1000})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(".app--ready", timeout=10000)
    page.wait_for_timeout(600)
    page.screenshot(path=f"{out}/01-initial.png", full_page=False)

    rows = lambda: page.locator("tr.row:not(.row--detail)")
    n0 = rows().count()
    check("rows rendered", n0 >= 40, f"{n0} rows")

    # 既定順: 陣営(邪兎屋が先頭) → Ver. → 名前
    ids5 = lambda: [rows().nth(i).get_attribute("data-testid") for i in range(5)]
    EXPECT_HEAD = ["row-anby", "row-nicole", "row-billy", "row-nekomata", "row-starlight_billy"]  # 邪兎屋 Ver.1.0 を localeCompare(ja) 順(かな→漢字)、次に Ver.2.8
    check("default order: faction > version > name", ids5() == EXPECT_HEAD, str(ids5()))
    # 陣営色帯とレアリティチップ
    band = lambda rid: page.locator(f'[data-testid="row-{rid}"] .td--name').evaluate("e => getComputedStyle(e).borderLeftColor")
    check("faction color band (cunning_hares #ff498c)", band("anby") == "rgb(255, 73, 140)", band("anby"))
    check("faction color band (victoria #404049)", band("ellen") == "rgb(64, 64, 73)", band("ellen"))
    check("faction color band (neps public order #c9a97b)", band("cissia") == "rgb(201, 169, 123)", band("cissia"))
    rtxt = lambda rid: page.locator(f'[data-testid="row-{rid}"] .rarity').inner_text()
    check("rarity chips read S級 / A級", rtxt("ellen") == "S級" and rtxt("anby") == "A級", f"{rtxt('ellen')} / {rtxt('anby')}")

    # (a) 列ヘッダクリックでソート
    first_names = lambda: [rows().nth(i).get_attribute("data-testid") for i in range(min(5, rows().count()))]
    before = first_names()
    page.locator('[data-testid="th-crit_dmg"]').click()
    page.wait_for_timeout(300)
    after = first_names()
    check("sort by column changes order", before != after, f"{before[:3]} -> {after[:3]}")
    page.locator('[data-testid="th-atk_pct"]').click(modifiers=["Shift"])
    page.wait_for_timeout(300)
    check("multi-key sort shows 2 keys", page.locator(".sortkey").count() == 2)
    page.locator('[data-testid="sort-clear"]').click(); page.wait_for_timeout(300)
    check("clearing sort returns to default order", ids5() == EXPECT_HEAD, str(ids5()))
    page.locator('[data-testid="th-crit_dmg"]').click(); page.wait_for_timeout(200)
    page.locator('[data-testid="th-atk_pct"]').click(modifiers=["Shift"]); page.wait_for_timeout(200)
    page.screenshot(path=f"{out}/02-sorted.png")

    # (b) 一括心象映画 0 -> 6 でセル値が変わる
    def cell_text(row_id, stat):
        return page.locator(f'[data-testid="row-{row_id}"] [data-testid="cell-{stat}"]').inner_text()
    # 心象映画で変化するセルを探す
    sample = None
    for rid in ["nicole", "lucy", "caesar", "astra", "rina", "grace"]:
        row = page.locator(f'[data-testid="row-{rid}"]')
        if row.count() == 0:
            continue
        cells = row.locator("td.cell")
        for i in range(cells.count()):
            stat = cells.nth(i).get_attribute("data-testid").replace("cell-", "")
            v0 = cell_text(rid, stat)
            page.locator('[data-testid="global-ms-6"]').click(); page.wait_for_timeout(200)
            v6 = cell_text(rid, stat)
            page.locator('[data-testid="global-ms-0"]').click(); page.wait_for_timeout(200)
            if v0 != v6:
                sample = (rid, stat, v0, v6); break
        if sample: break
    check("global mindscape changes a cell value", sample is not None, str(sample))

    # (c) 個別設定で1キャラのみ変わる
    if sample:
        rid, stat, v0, v6 = sample
        other = next(
            r for r in ["ellen", "zhu_yuan", "miyabi", "anby", "rina", "caesar", "lucy", "astra"]
            if r != rid and page.locator(f'[data-testid="row-{r}"] td.cell').count() > 0
        )
        other_stat = page.locator(f'[data-testid="row-{other}"] td.cell').first.get_attribute("data-testid").replace("cell-", "")
        o_before = cell_text(other, other_stat)
        page.locator(f'[data-testid="row-ms-{rid}"]').select_option("6"); page.wait_for_timeout(200)
        check("per-character override changes only that row", cell_text(rid, stat) == v6 and cell_text(other, other_stat) == o_before)
        check("override marker shown", page.locator(f'[data-testid="row-reset-{rid}"]').count() == 1)
        page.screenshot(path=f"{out}/03-override.png")
        page.locator(f'[data-testid="row-reset-{rid}"]').click(); page.wait_for_timeout(200)
        check("reset returns to global", cell_text(rid, stat) == v0)

    # (d) アタッカー選択で applicable / muted が両方存在
    page.locator('[data-testid="attacker-toggle"]').click(); page.wait_for_timeout(200)
    page.locator('[data-testid="attacker-opt-ellen"]').click(); page.wait_for_timeout(400)
    na = page.locator(".cell--applicable").count(); nm = page.locator(".cell--muted").count()
    check("attacker highlight: applicable & muted cells", na > 0 and nm > 0, f"applicable={na} muted={nm}")
    check("attacker row marked as self", page.locator("tr.row--self").count() == 1)
    check("attacker card shows rarity chip", page.locator(".attacker__card .rarity").inner_text() == "S級")
    page.screenshot(path=f"{out}/04-attacker.png")
    # ドロップダウンのキーボード操作: 解除 → ↓↓ Enter で先頭キャラ(anby)を選択、Esc で閉じる
    page.locator('[data-testid="attacker-clear"]').click(); page.wait_for_timeout(200)
    tg = page.locator('[data-testid="attacker-toggle"]'); tg.focus()
    tg.press("ArrowDown"); page.wait_for_timeout(100)
    check("ArrowDown opens list", page.locator('[data-testid="attacker-list"]').count() == 1)
    tg.press("ArrowDown"); tg.press("Enter"); page.wait_for_timeout(300)
    check("keyboard selects first character (anby)", page.locator('[data-testid="row-anby"].row--self').count() == 1)
    tg.click(); page.wait_for_timeout(100)
    check("list options carry faction band", page.locator('[data-testid="attacker-opt-anby"]').evaluate("e => getComputedStyle(e).borderLeftColor") == "rgb(255, 73, 140)")
    tg.press("Escape"); page.wait_for_timeout(100)
    check("Escape closes list", page.locator('[data-testid="attacker-list"]').count() == 0)
    tg.click(); page.locator('[data-testid="attacker-opt-ellen"]').click(); page.wait_for_timeout(300)

    # (e) 属性フィルタで行数が減る
    page.locator('[data-testid="filter-el-ice"]').click(); page.wait_for_timeout(300)
    n1 = rows().count()
    check("element filter reduces rows", 0 < n1 < n0, f"{n0} -> {n1}")
    page.locator('[data-testid="search"]').fill("エレン"); page.wait_for_timeout(300)
    check("search narrows to 1 row", rows().count() == 1)
    page.screenshot(path=f"{out}/05-filter.png")

    # 自バフを除く(既定ON) → OFF で効果数が増える
    n_on = int(page.locator(".stat-chip").nth(1).inner_text().split()[0])
    page.locator('[data-testid="exclude-self"]').click(); page.wait_for_timeout(300)
    n_off = int(page.locator(".stat-chip").nth(1).inner_text().split()[0])
    check("exclude-self default ON hides self buffs", n_off > n_on, f"{n_on} -> {n_off}")
    page.locator('[data-testid="exclude-self"]').click(); page.wait_for_timeout(200)

    # ポテンシャル解放: 対象キャラ(エレン)のみ個別セレクトがあり、T6で自バフ値が変わる
    check("potential select only on hasPotential rows",
          page.locator('[data-testid="row-pt-ellen"]').count() == 1 and page.locator('[data-testid="row-pt-zhu_yuan"]').count() == 0)
    page.locator('[data-testid="exclude-self"]').click(); page.wait_for_timeout(200)  # 自バフ含む
    check("potential default is T6", page.locator('[data-testid="global-pt-6"]').get_attribute("aria-checked") == "true")
    page.locator('[data-testid="global-pt-0"]').click(); page.wait_for_timeout(300)
    before_pt = page.locator('[data-testid="row-ellen"] [data-testid="cell-crit_dmg"]').inner_text()
    page.locator('[data-testid="global-pt-6"]').click(); page.wait_for_timeout(300)
    after_pt = page.locator('[data-testid="row-ellen"] [data-testid="cell-crit_dmg"]').inner_text()
    check("global potential T6 changes Ellen crit_dmg", before_pt != after_pt, f"{before_pt!r} -> {after_pt!r}")

    # 詳細パネル
    page.locator('[data-testid="search"]').fill(""); page.locator('[data-testid="filter-el-ice"]').click()
    page.locator('[data-testid="row-ellen"] .namebtn').click(); page.wait_for_timeout(300)
    check("detail panel opens", page.locator(".row--detail").count() == 1)
    page.screenshot(path=f"{out}/06-detail.png")

    # (f) 追加能力トグル: 既定 ON、一括 OFF で追加能力由来のセルが消える、個別チェックで1行だけ、リセットで戻る
    aa_cell = lambda rid: page.locator(f'[data-testid="row-{rid}"] [data-testid="cell-chain_dmg_pct"]')
    check("additional-ability default ON (global + row checkbox)",
          page.locator('[data-testid="global-aa-on"]').get_attribute("aria-checked") == "true"
          and page.locator('[data-testid="row-aa-koleda"]').is_checked())
    check("row checkbox label shows condition", "同属性 / 同陣営" in page.locator('[data-testid="row-koleda"] .aa__label').inner_text(),
          page.locator('[data-testid="row-koleda"] .aa__label').inner_text())
    check("koleda additional-ability cell present when ON", aa_cell("koleda").count() == 1)
    page.locator('[data-testid="global-aa-off"]').click(); page.wait_for_timeout(300)
    check("global OFF removes koleda additional-ability cell", aa_cell("koleda").count() == 0)
    check("global OFF unchecks row checkbox", not page.locator('[data-testid="row-aa-koleda"]').is_checked())
    page.screenshot(path=f"{out}/07-aa-off.png")
    page.locator('[data-testid="global-aa-on"]').click(); page.wait_for_timeout(300)
    check("global ON restores cell", aa_cell("koleda").count() == 1)
    other_cell = page.locator('[data-testid="row-caesar"] [data-testid="cell-enemy_dmg_taken_pct"]')  # シーザーの追加能力(敵被ダメ増加)
    check("other row additional-ability cell present", other_cell.count() == 1)
    page.locator('[data-testid="row-aa-koleda"]').click(); page.wait_for_timeout(300)
    check("row uncheck removes only that row's cell", aa_cell("koleda").count() == 0 and other_cell.count() == 1)
    check("row uncheck shows override marker", page.locator('[data-testid="row-reset-koleda"]').count() == 1)
    page.locator('[data-testid="row-reset-koleda"]').click(); page.wait_for_timeout(300)
    check("row reset restores cell and checkbox", aa_cell("koleda").count() == 1 and page.locator('[data-testid="row-aa-koleda"]').is_checked())
    page.screenshot(path=f"{out}/08-aa-row.png")
    page.locator('[data-testid="exclude-self"]').click(); page.wait_for_timeout(200)

    # A級のみ M6 / P5 ボタン: A級行の個別セレクトだけが変わる
    page.locator('[data-testid="search"]').fill(""); page.wait_for_timeout(300)  # 氷属性フィルタのみ(蒼角=A級, エレン=S級)
    page.locator('[data-testid="arank-ms6"]').click(); page.locator('[data-testid="arank-wp5"]').click(); page.wait_for_timeout(300)
    check("A-rank only M6/P5 buttons",
          page.locator('[data-testid="row-ms-soukaku"]').input_value() == "6" and page.locator('[data-testid="row-wp-soukaku"]').input_value() == "5"
          and page.locator('[data-testid="row-ms-ellen"]').input_value() == "0" and page.locator('[data-testid="row-wp-ellen"]').input_value() == "0")
    page.locator('text=個別設定をすべてリセット').click(); page.wait_for_timeout(200)


    check("no page errors", len(errors) == 0, "; ".join(errors)[:300])
    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)} passed / {len(failed)} failed")
sys.exit(1 if failed else 0)

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
    page.locator('[data-testid="attacker-clear"]').click(); page.wait_for_timeout(200)  # 以降の追加能力トグル検証は保存設定のみで見る

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
    other_cell = page.locator('[data-testid="row-lycaon"] [data-testid="cell-enemy_stun_dmg_multiplier"]')  # ライカンの追加能力(弱体倍率 +35%)。シーザーの追加能力は 2026-10-19 に dmg_pct へ移り音動機と同列になったため使わない
    check("other row additional-ability cell present", other_cell.count() == 1)
    page.locator('[data-testid="row-aa-koleda"]').click(); page.wait_for_timeout(300)
    check("row uncheck removes only that row's cell", aa_cell("koleda").count() == 0 and other_cell.count() == 1)
    check("row uncheck shows override marker", page.locator('[data-testid="row-reset-koleda"]').count() == 1)
    page.locator('[data-testid="row-reset-koleda"]').click(); page.wait_for_timeout(300)
    check("row reset restores cell and checkbox", aa_cell("koleda").count() == 1 and page.locator('[data-testid="row-aa-koleda"]').is_checked())
    page.screenshot(path=f"{out}/08-aa-row.png")

    # (g) アタッカー選択で追加能力の発動可否を自動判定(2人基準)。解除で元に戻り、別アタッカーで再判定、手動変更は保持
    aa_on = lambda rid: page.locator(f'[data-testid="row-aa-{rid}"]').is_checked()
    aa_mode = lambda rid: page.locator(f'[data-testid="row-aa-mode-{rid}"]').get_attribute("data-aa-mode")
    page.locator('[data-testid="row-aa-koleda"]').click(); page.wait_for_timeout(200)  # 保存設定でクレタ OFF にしておく(解除時の復元確認用)
    check("pre: koleda OFF in saved settings", not aa_on("koleda"))
    page.locator('[data-testid="attacker-toggle"]').click(); page.locator('[data-testid="attacker-opt-ellen"]').click(); page.wait_for_timeout(400)
    check("ellen: lycaon ON (same element)", aa_on("lycaon") and aa_mode("lycaon") == "auto")
    check("ellen: koleda OFF (fire/belobog/rupture not met)", not aa_on("koleda") and aa_mode("koleda") == "auto")
    check("ellen: lighter ON ([強攻])", aa_on("lighter"))
    check("ellen: caesar ON (ellen has parry support)", aa_on("caesar"))
    check("ellen: self row not judged", aa_mode("ellen") == "")
    check("attacker note shown", page.locator('[data-testid="attacker-aa-note"]').count() == 1)
    page.screenshot(path=f"{out}/09-aa-auto.png")
    page.locator('[data-testid="row-aa-koleda"]').click(); page.wait_for_timeout(200)  # 手動で ON
    check("manual ON kept while same attacker", aa_on("koleda") and aa_mode("koleda") == "manual")
    page.locator('[data-testid="row-aa-lycaon"]').click(); page.wait_for_timeout(200)  # 手動で OFF
    check("manual change does not create saved override", not aa_on("lycaon") and aa_mode("lycaon") == "manual" and page.locator('[data-testid="row-reset-lycaon"]').count() == 0)
    page.locator('[data-testid="attacker-toggle"]').click(); page.locator('[data-testid="attacker-opt-billy"]').click(); page.wait_for_timeout(400)
    check("billy: caesar OFF (billy has evasive assist)", not aa_on("caesar") and aa_mode("caesar") == "auto")
    check("billy: koleda re-judged OFF (manual dropped)", not aa_on("koleda") and aa_mode("koleda") == "auto")
    check("billy: nicole ON (same faction)", aa_on("nicole"))
    page.locator('[data-testid="attacker-toggle"]').click(); page.locator('[data-testid="attacker-opt-claretta"]').click(); page.wait_for_timeout(400)
    check("claretta: koleda ON via potential [鋭御] (T6 default)", aa_on("koleda") and aa_mode("koleda") == "auto")
    page.locator('[data-testid="global-pt-0"]').click(); page.wait_for_timeout(300)
    check("claretta: koleda OFF when potential T0", not aa_on("koleda") and aa_mode("koleda") == "auto")
    page.locator('[data-testid="global-pt-6"]').click(); page.wait_for_timeout(300)
    check("claretta: koleda ON again at T6", aa_on("koleda"))
    page.locator('[data-testid="attacker-toggle"]').click(); page.locator('[data-testid="attacker-opt-billy"]').click(); page.wait_for_timeout(400)
    page.locator('[data-testid="global-aa-off"]').click(); page.wait_for_timeout(300)
    check("global OFF while attacker selected turns rows OFF", not aa_on("nicole") and not aa_on("lycaon"))
    page.locator('[data-testid="global-aa-on"]').click(); page.wait_for_timeout(300)
    check("global ON while attacker selected turns rows ON", aa_on("nicole") and aa_on("caesar"))
    page.locator('[data-testid="attacker-clear"]').click(); page.wait_for_timeout(300)
    check("clear: koleda back to saved OFF, lycaon ON, no mode", not aa_on("koleda") and aa_on("lycaon") and aa_mode("koleda") == "")
    page.locator('[data-testid="row-reset-koleda"]').click(); page.wait_for_timeout(200)
    check("post: koleda reset to ON", aa_on("koleda"))
    page.locator('[data-testid="exclude-self"]').click(); page.wait_for_timeout(200)

    # A級のみ M6 / P5 ボタン: A級行の個別セレクトだけが変わる
    page.locator('[data-testid="search"]').fill(""); page.wait_for_timeout(300)  # 氷属性フィルタのみ(蒼角=A級, エレン=S級)
    page.locator('[data-testid="arank-ms6"]').click(); page.locator('[data-testid="arank-wp5"]').click(); page.wait_for_timeout(300)
    check("A-rank only M6/P5 buttons",
          page.locator('[data-testid="row-ms-soukaku"]').input_value() == "6" and page.locator('[data-testid="row-wp-soukaku"]').input_value() == "5"
          and page.locator('[data-testid="row-ms-ellen"]').input_value() == "0" and page.locator('[data-testid="row-wp-ellen"]').input_value() == "0")
    page.locator('text=個別設定をすべてリセット').click(); page.wait_for_timeout(200)


    # (g) ダメージ比較ビュー
    page.locator('[data-testid="view-calc"]').click(); page.wait_for_timeout(500)
    check("calc: empty state before attacker", page.locator('[data-testid="calc-empty"]').count() == 1)
    page.locator('[data-testid="calc-attacker"]').select_option("miyabi"); page.wait_for_timeout(600)
    ratio = lambda rid: float(page.locator(f'[data-testid="calc-ratio-{rid}"]').inner_text().replace("×", ""))
    check("calc: miyabi defaults to anomaly mode", page.locator('[data-testid="calc-mode-anomaly"]').get_attribute("aria-checked") == "true")
    check("calc: baseline shows anomaly chips", "異常マスタリー×Lv" in page.locator('[data-testid="calc-baseline"]').inner_text())
    check("calc: velina row uses turbulence conversion in anomaly mode", page.locator('[data-testid="calc-row-velina"] .tag--turb').count() == 1)
    page.locator('[data-testid="calc-mode-direct"]').click(); page.wait_for_timeout(400)
    check("calc: no turbulence tag in direct mode", page.locator('[data-testid="calc-row-velina"] .tag--turb').count() == 0)
    check("calc: attacker row excluded", page.locator('[data-testid="calc-row-miyabi"]').count() == 0)
    check("calc: astra ratio > 1", ratio("astra") > 1.0, str(ratio("astra")))
    check("calc: lycaon ratio > 1 (ice res down)", ratio("lycaon") > 1.0, str(ratio("lycaon")))
    rows_calc = page.locator("tr.row--calc")
    first = [float(rows_calc.nth(i).locator(".ratio").first.inner_text().replace("×", "")) for i in range(6)]
    check("calc: rows sorted desc by ratio", all(first[i] >= first[i + 1] for i in range(5)), str(first))
    page.screenshot(path=f"{out}/07-calc-direct.png", full_page=True)
    r_on = ratio("lycaon")
    page.locator('[data-testid="calc-broken"]').click(); page.wait_for_timeout(400)
    r_off = ratio("lycaon")
    check("calc: unbroken removes lycaon stun-multiplier gain", r_off < r_on, f"{r_on} -> {r_off}")
    page.locator('[data-testid="calc-broken"]').click(); page.wait_for_timeout(300)
    # 弱体倍率の上限: 150 にすると弱体倍率バフが無効化され、ライカンは耐性ダウン分だけ(×1.25)になる
    page.locator('[data-testid="calc-stun-cap"]').fill("150"); page.wait_for_timeout(400)
    check("calc: stun multiplier cap 150 removes lycaon's multiplier gain", abs(ratio("lycaon") - 1.25) < 0.001, str(ratio("lycaon")))
    page.locator('[data-testid="calc-stun-cap"]').fill(""); page.wait_for_timeout(300)
    check("calc: clearing stun cap restores", abs(ratio("lycaon") - r_on) < 0.001, str(ratio("lycaon")))
    page.locator('[data-testid="calc-enemy"]').select_option("kusarikku"); page.wait_for_timeout(400)
    check("calc: kusarikku shows ice resistance for miyabi", "氷耐性 20%" in page.locator(".panel--calc-enemy").inner_text())
    r_k = ratio("lycaon")
    check("calc: res-down buff worth more vs resistant enemy", r_k > r_on, f"{r_on} -> {r_k}")
    page.locator('[data-testid="calc-enemy"]').select_option("generic_boss"); page.wait_for_timeout(300)
    # 3 枠目: アストラを入れると候補から消え、基準が変わる(ライカンの比率は基準が上がる分だけ変化)
    base_txt = page.locator('[data-testid="calc-baseline"]').inner_text()
    page.locator('[data-testid="calc-third"]').select_option("astra"); page.wait_for_timeout(500)
    check("calc: third member removed from candidates", page.locator('[data-testid="calc-row-astra"]').count() == 0)
    check("calc: third member changes baseline", page.locator('[data-testid="calc-baseline"]').inner_text() != base_txt)
    page.locator('[data-testid="calc-third"]').select_option(""); page.wait_for_timeout(300)
    # 固定バフ: プリセット追加で行が増え、手入力の会心ダメ +100 で会心系バフの比率が下がる
    page.locator('[data-testid="calc-preset"]').select_option("da_3_2_3_hagyo"); page.wait_for_timeout(300)
    check("calc: preset adds fixed rows", page.locator('[data-testid="calc-fixed-list"] .fixed-row').count() == 2)
    r_before = ratio("roxy")
    page.locator('[data-testid="calc-fixed-add"]').click(); page.wait_for_timeout(200)
    last = page.locator('[data-testid="calc-fixed-list"] .fixed-row').last
    last.locator("select").first.select_option("crit_dmg"); last.locator("input").fill("200"); page.wait_for_timeout(400)
    check("calc: fixed crit dmg +200 lowers roxy's relative gain (team crit dmg)", ratio("roxy") < r_before, f"{r_before} -> {ratio('roxy')}")
    check("calc: cissia's additional-ability crit buff not applied for miyabi (condition unmet)", ratio("cissia") == 1.0, str(ratio("cissia")))
    check("calc: anomaly candidate enables miyabi's additional ability", page.locator('[data-testid="calc-row-grace"] .tag--enable').count() == 1)
    # 上書き: 会心率を直接入力すると上書き表示、リセットで戻る
    page.locator('[data-testid="calc-field-critRate"]').fill("100"); page.wait_for_timeout(300)
    check("calc: override field marked", page.locator('[data-testid="calc-field-critRate"]').evaluate("e => e.closest('.field').classList.contains('field--over')"))
    page.locator('[data-testid="calc-override-reset"]').click(); page.wait_for_timeout(200)
    check("calc: override reset clears", page.locator('[data-testid="calc-field-critRate"]').input_value() == "")
    # 行クリックで寄与バフの詳細
    page.locator('[data-testid="calc-row-astra"]').click(); page.wait_for_timeout(300)
    check("calc: row click shows contributions", page.locator(".detail__list--calc .bufffx").count() >= 1)
    page.screenshot(path=f"{out}/08-calc-detail.png", full_page=True)
    # 命破アタッカー(儀玄): 貫通率のみのバフ提供者は ×1.00
    page.locator('[data-testid="calc-attacker"]').select_option("yixuan"); page.wait_for_timeout(600)
    check("calc: rupture attacker shows 透徹力 chip", "透徹力" in page.locator('[data-testid="calc-baseline"]').inner_text())
    check("calc: rupture attacker gets astra's ATK via sheer force", ratio("astra") > 1.0, str(ratio("astra")))
    nicole_contrib = page.locator('[data-testid="calc-row-nicole"] .td--contrib').inner_text()
    check("calc: rupture attacker ignores nicole's DEF down (ether dmg still counts)", "防御DOWN" not in nicole_contrib and ratio("nicole") > 1.0, f"{ratio('nicole')} / {nicole_contrib}")
    # 鋭御アタッカー(クラレッタ): 暴傷の内訳が出て、鋭撃ダメ% の固定バフが別枠で効く
    page.locator('[data-testid="calc-attacker"]').select_option("claretta"); page.wait_for_timeout(600)
    check("calc: armorer defaults to 重傷 mode", page.locator('[data-testid="calc-mode-grievous"]').get_attribute("aria-checked") == "true")
    check("calc: armorer shows 暴傷 note", page.locator('[data-testid="calc-armorer-note"]').count() == 1 and "会心/暴傷" in page.locator('[data-testid="calc-baseline"]').inner_text())
    check("calc: 重傷 mode hides attack-type selector", page.locator('[data-testid="calc-attack-type"]').count() == 0)
    page.locator('[data-testid="calc-mode-direct"]').click(); page.wait_for_timeout(300)
    check("calc: direct mode shows attack-type selector again", page.locator('[data-testid="calc-attack-type"]').count() == 1)
    page.locator('[data-testid="calc-mode-grievous"]').click(); page.wait_for_timeout(300)
    check("calc: roxy's sharp crit dmg +20 helps claretta", ratio("roxy") > 1.0, str(ratio("roxy")))
    # 狂咲モード(プロメイア): 狂咲ダメ% が効く
    page.locator('[data-testid="calc-attacker"]').select_option("vivian"); page.wait_for_timeout(600)
    check("calc: 重傷 disabled for non-armorer", page.locator('[data-testid="calc-mode-grievous"]').is_disabled())
    page.locator('[data-testid="calc-mode-abloom"]').click(); page.wait_for_timeout(400)
    check("calc: abloom mode promeia ratio > 1", ratio("promeia") > 1.0, str(ratio("promeia")))
    r_seth_abloom = ratio("seth")
    page.locator('[data-testid="calc-mode-anomaly"]').click(); page.wait_for_timeout(400)
    check("calc: vivian's abloom scales with AP twice (seth gives AP)", r_seth_abloom > ratio("seth") > 1.0, f"abloom {r_seth_abloom} / anomaly {ratio('seth')}")
    page.locator('[data-testid="calc-mode-abloom"]').click(); page.wait_for_timeout(400)
    page.locator('[data-testid="calc-anomaly-crit"]').click(); page.wait_for_timeout(400)
    check("calc: anomaly crit toggle changes baseline", "会心 ×1.000" not in page.locator('[data-testid="calc-baseline"]').inner_text())
    page.locator('[data-testid="view-table"]').click(); page.wait_for_timeout(400)
    check("calc: back to table view", page.locator("tr.row").count() > 40)

    check("no page errors", len(errors) == 0, "; ".join(errors)[:300])
    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)} passed / {len(failed)} failed")
sys.exit(1 if failed else 0)

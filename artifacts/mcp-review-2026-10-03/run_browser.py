import asyncio
import hashlib
import json
import re
import sys
import time
from pathlib import Path
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "browser"
OUT.mkdir(exist_ok=True)
URL = "http://localhost:8080/"
RESULTS = []
EVENTS = []
PHASE = "setup"
CONTEXTS = []

def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def check(ids, name, passed, detail=None, method="浏览器 UI"):
    item = {"ids": ids.split(), "name": name, "status": "PASS" if passed else "FAIL", "detail": detail, "method": method, "phase": PHASE}
    RESULTS.append(item)
    write("checks.json", RESULTS)
    display = json.dumps(detail, ensure_ascii=False)
    print(item["status"], ids, name, display[:2000], flush=True)

async def observe(page):
    page.on("pageerror", lambda e: EVENTS.append({"phase": PHASE, "kind": "pageerror", "message": str(e)}))
    page.on("console", lambda m: EVENTS.append({"phase": PHASE, "kind": m.type, "message": m.text, "location": m.location}) if m.type in ("warning", "error") else None)
    page.on("requestfailed", lambda r: EVENTS.append({"phase": PHASE, "kind": "requestfailed", "url": r.url, "message": r.failure}))
    page.on("response", lambda r: EVENTS.append({"phase": PHASE, "kind": "http_error", "url": r.url, "status": r.status}) if r.status >= 400 else None)

async def fresh(browser, fixture=None, memory=False):
    ctx = await browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True, locale="zh-CN", timezone_id="Asia/Shanghai")
    CONTEXTS.append(ctx)
    if memory:
        await ctx.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('QA storage disabled','QuotaExceededError')}")
    page = await ctx.new_page()
    page.set_default_timeout(6000)
    await observe(page)
    await page.goto(URL, wait_until="networkidle")
    await page.wait_for_function("window.KZ && KZ.Save && KZ.Boot")
    if fixture is not None:
        await page.evaluate("(s)=>localStorage.setItem('kzdt.v1.save', JSON.stringify(s))", fixture)
        await page.reload(wait_until="networkidle")
    return page

def fixture(points=500, char="c3", all_levels=False):
    now = int(time.time() * 1000)
    obj = {"v": 1, "created": now, "points": points, "charId": char,
        "owned": [char + "-o1"] if char else [], "equipped": {char: "o1"} if char else {},
        "levels": {}, "taught": {}, "settings": {"sfx": False, "voice": False, "restMin": 0, "dys": False, "strictCase": True},
        "daily": {"date": time.strftime("%Y-%m-%d"), "firstBonus": False, "arcade": 0},
        "play": {"activeMs": 0, "lastTick": now, "restAck": now}}
    if all_levels:
        for world, length, start in (("A", 13, 0), ("B", 18, 1), ("C", 15, 1), ("D", 75, 1)):
            for i in range(start, start + length):
                obj["levels"][world + str(i)] = {"stars": 3, "tries": 1, "cleared": True, "best": {"stars": 3, "speed": 100, "acc": 100, "score": 10000}}
        obj["taught"]["A0"] = True
    return obj

async def choose(page, index=2):
    await page.locator(".pick__item").nth(index).click()
    await page.locator(".cover__cta > button").first.click()

async def settings(page):
    if await page.locator("#overlay").is_visible():
        title = await page.locator("#overlay .overlay__title").inner_text()
        if title == "设置":
            return
        if await page.get_by_role("button", name="关闭", exact=True).count():
            await page.get_by_role("button", name="关闭", exact=True).click()
    await page.get_by_role("button", name="设置", exact=True).click()

async def import_file(page, data, filename="fixture.json", raw=False):
    await settings(page)
    path = OUT / filename
    path.write_text(data if raw else json.dumps(data, ensure_ascii=False), encoding="utf-8")
    async with page.expect_file_chooser() as event:
        await page.get_by_role("button", name="导入存档", exact=True).click()
    await (await event.value).set_files(str(path))
    await page.wait_for_function("!document.querySelector('input[type=file]')")
    return path

async def saved(page):
    return await page.evaluate("JSON.parse(JSON.stringify(KZ.Save.data))")

async def open_level(page, lid, mode="practice"):
    await page.get_by_role("button", name="闯关地图", exact=True).click()
    world = lid[0]
    await page.locator(".worlds .world-tab").nth("ABCD".index(world)).click()
    index = await page.evaluate("(id)=>KZ.Levels.byWorld(id[0]).map(l=>l.id).indexOf(id)", lid)
    await page.locator(".node").nth(index).click()
    await page.get_by_role("button", name="先练一练（不限时）" if mode == "practice" else "开始挑战", exact=True).click()
    if await page.get_by_role("button", name="我准备好了，开始练", exact=True).count():
        await page.get_by_role("button", name="我准备好了，开始练", exact=True).click()

KEYS = {"Space": "Space", "Semicolon": ";", "Quote": "'", "Backquote": "`", "Minus": "-", "Equal": "=", "BracketLeft": "[", "BracketRight": "]", "Backslash": "\\", "Comma": ",", "Period": ".", "Slash": "/"}

async def next_cell(page):
    return await page.evaluate("""()=>{let s=KZ.Typing.session;if(!s||s.ended)return null;let t=s.targets[s.pos],c=t.chars[s.cur];return {code:c.code,ch:c.ch,strict:c.strict,loose:s.level.caseStrict===false||!KZ.Save.data.settings.strictCase}}""")

async def press_cell(page, cell, use_shift=None):
    code = cell["code"]
    key = code[-1].lower() if code.startswith("Key") else code[-1] if code.startswith("Digit") else KEYS[code]
    shift = cell["strict"] and not (cell.get("loose") and re.fullmatch("[A-Z]", cell["ch"])) if use_shift is None else use_shift
    await page.keyboard.press(("Shift+" if shift else "") + key)
    await page.wait_for_timeout(18)

async def finish_keys(page, max_keys=2000):
    count = 0
    while (cell := await next_cell(page)) is not None and count < max_keys:
        await press_cell(page, cell)
        count += 1
    if count == max_keys:
        raise RuntimeError("Typing did not finish within the key budget")
    return count

async def flow(browser):
    page = await fresh(browser)
    check("C1", "18 张形象卡均渲染默认造型", await page.locator(".pick__item").count() == 18 and await page.locator(".pick__item canvas").count() == 18)
    await choose(page)
    check("C2 M1 M2 M3", "初始顶栏、四个世界、A0/A1 无门槛和 A2 锁定", await page.locator("#topbar button").count() == 5 and await page.locator(".world-tab").count() == 4 and await page.locator(".node.node--locked").count() == 11 and "全部 0 / 121 关" in await page.locator("body").inner_text())
    await open_level(page, "A1", "challenge")
    check("K1", "挑战 HUD 含速度、准确率、剩余秒和完成条数", "剩余秒" in await page.locator(".play__hud").inner_text())
    await page.get_by_role("button", name="暂停", exact=True).click()
    before = await page.locator(".play__stat:nth-child(3) b").inner_text()
    await page.wait_for_timeout(1500)
    check("K10", "暂停期间计时不减少", before == await page.locator(".play__stat:nth-child(3) b").inner_text(), before)
    await page.get_by_role("button", name="继续打", exact=True).click()
    count = await finish_keys(page)
    check("K2 K4 K9 K12 K13", "真实键盘完整 A1 通关，HUD 30/30、三星及下一关入口", count == 46 and await page.locator(".play__stat:nth-child(4) b").inner_text() == "30/30" and await page.locator("#overlay .stars i.on").count() == 3 and await page.get_by_role("button", name=re.compile("^下一关 ")).count() == 1, {"keys": count, "reward": await page.locator("#overlay").inner_text()})
    check("K2", "挑战提前完成时进度条按时间而非条数", await page.locator(".meter__fill").evaluate("e=>parseFloat(e.style.width)") < 100)
    await page.screenshot(path=str(OUT / "a1-challenge.png"), full_page=True)
    await page.get_by_role("button", name="回到地图", exact=True).click()
    check("H7 M3", "首通加积分并解锁 A2", (await saved(page))["points"] >= 90 and not await page.locator(".node").nth(2).evaluate("e=>e.classList.contains('node--locked')"), (await saved(page))["points"])
    snapshot = await saved(page)
    await page.reload(wait_until="networkidle")
    state = await saved(page)
    check("S3", "有角色刷新进地图并保留存档", await page.locator(".node").count() == 13 and all(state[k] == snapshot[k] for k in ("charId", "points", "levels", "owned", "equipped", "settings")))
    await page.locator(".topbar__avatar").click()
    check("C4", "换形象保留积分星数且旧角色高亮", await page.locator(".pick__item.is-sel").count() == 1 and (await saved(page))["points"] == snapshot["points"])
    await choose(page)
    await open_level(page, "A1", "challenge")
    await finish_keys(page)
    check("H8", "再次三星通关保留星数且不重复首通日奖励", (await saved(page))["levels"]["A1"]["stars"] == 3 and (await saved(page))["points"] > snapshot["points"])
    await page.get_by_role("button", name="回到地图", exact=True).click()
    await page.evaluate("(()=>{window.__oldFallStart=KZ.Fall.start;KZ.Fall.start=function(h,w){return window.__qaFall=window.__oldFallStart(h,w)}})()")
    await page.get_by_role("button", name="自由练习", exact=True).click()
    await page.wait_for_function("window.__qaFall.objs.some(o=>!o.dead)", timeout=8000)
    cell = await page.evaluate("()=>{let o=__qaFall.objs.find(o=>!o.dead);return {code:o.chars[0].code,ch:o.chars[0].ch,strict:o.chars[0].strict,fs:o.fs}}")
    await press_cell(page, cell)
    await page.wait_for_function("__qaFall.score>=1")
    check("A1 A2 A3", "自由练习实际掉落、字号和键盘击碎计分", cell["fs"] == 52 and await page.locator(".play__stat:first-child b").inner_text() == "1", cell)
    await page.get_by_role("button", name="结束练习", exact=True).click()
    check("A6", "结束练习真实结算并加分", "积分" in await page.locator("#overlay").inner_text())
    await page.get_by_role("button", name="回地图", exact=True).click()
    await page.get_by_role("button", name="服装商店", exact=True).first.click()
    await page.wait_for_timeout(400)
    before = await saved(page)
    await page.locator(".fit").nth(1).get_by_role("button").click()
    after = await saved(page)
    check("H1 H2 H5", "8 件服装、实际购买扣 120 分并自动穿戴", await page.locator(".fit").count() == 8 and after["points"] == before["points"] - 120 and "c3-o2" in after["owned"] and after["equipped"]["c3"] == "o2")
    await settings(page)
    check("D1 S4", "可写存储显示本机保存和真实积分", "模式：本机保存" in await page.locator("#overlay").inner_text())
    before_export = await saved(page)
    async with page.expect_download() as event:
        await page.get_by_role("button", name="导出存档", exact=True).click()
    download = await event.value
    download_path = OUT / download.suggested_filename
    await download.save_as(str(download_path))
    exported = json.loads(download_path.read_text(encoding="utf-8-sig"))
    check("D2", "取得实际下载文件且完整存档一致", bool(re.fullmatch(r"打字小勇士-存档-\d{4}-\d{2}-\d{2}\.json", download.suggested_filename)) and exported == before_export,
        {"file": download.suggested_filename, "bytes": download_path.stat().st_size, "sha256": hashlib.sha256(download_path.read_bytes()).hexdigest()})
    await settings(page)
    await page.locator("#overlay .row").filter(has_text="容易看的字母").get_by_role("button").click()
    check("G3", "字母设置应用 body.dyslexic", await page.locator("body").evaluate("e=>e.classList.contains('dyslexic')"))
    async with page.expect_file_chooser() as event:
        await page.get_by_role("button", name="导入存档", exact=True).click()
    await (await event.value).set_files(str(download_path))
    await page.wait_for_function("!document.querySelector('input[type=file]')")
    await page.reload(wait_until="networkidle")
    restored = await saved(page)
    check("D3", "实际下载文件经文件选择器往返并刷新恢复", all(restored[k] == exported[k] for k in ("points", "charId", "levels", "owned", "equipped", "settings")), {"file": str(download_path)})
    await settings(page)
    await page.get_by_role("button", name="清空进度", exact=True).click()
    async with page.expect_download() as event:
        await page.get_by_role("button", name="先导出备份", exact=True).click()
    backup = await event.value
    await backup.save_as(str(OUT / "reset-backup.json"))
    await page.get_by_role("button", name="不要清空", exact=True).click()
    check("D7a", "取消清空保持进度，确认框备份实际下载", (await saved(page))["points"] == restored["points"] and json.loads((OUT / "reset-backup.json").read_text(encoding="utf-8"))["owned"] == restored["owned"])
    await page.get_by_role("button", name="清空进度", exact=True).click()
    await page.get_by_role("button", name="确定清空", exact=True).click()
    await page.reload(wait_until="networkidle")
    reset = await saved(page)
    check("D7 S3 V4", "确认清空并刷新进入封面，全部进度归零", reset["charId"] is None and reset["points"] == 0 and not reset["levels"] and not reset["owned"] and reset["settings"]["strictCase"] and not reset["settings"]["dys"] and await page.locator(".pick__item").count() == 18)
    await page.screenshot(path=str(OUT / "reset-cover.png"), full_page=True)
    await choose(page, 0)
    check("C3", "擎天柱确认弹出当前版权提醒", "自家孩子" in await page.locator("#overlay").inner_text() and "分享" in await page.locator("#overlay").inner_text(), await page.locator("#overlay").inner_text())
    await page.context.close()

async def save_edges(browser):
    page = await fresh(browser, fixture())
    for i, bad in enumerate(("not-json", '{"points":"9"}', '{"points":9,"owned":{}}', 'null', '{"points":9,"levels":{"A1":[]}}')):
        before = await saved(page)
        disk = await page.evaluate("localStorage.getItem('kzdt.v1.save')")
        await import_file(page, bad, f"bad-save-{i}.json", raw=True)
        check("D4", "坏档 UI 整体拒绝且内存/存储未变 " + str(i), "你的进度没有被改动" in await page.locator("#overlay").inner_text() and await saved(page) == before and await page.evaluate("localStorage.getItem('kzdt.v1.save')") == disk)
        await page.get_by_role("button", name="好", exact=True).click()
    high = fixture(9)
    high["levels"] = {"A1": {"stars": 99, "tries": 1, "best": {"stars": 99}}}
    await import_file(page, high, "stars-99.json")
    state = await saved(page)
    check("D5", "导入星数双处封顶且顶栏 3/363", state["levels"]["A1"]["stars"] == 3 and state["levels"]["A1"]["best"]["stars"] == 3 and "3/363" in await page.locator("#topbar").inner_text())
    await import_file(page, {"points": 9, "charId": "c3"}, "minimal-old-save.json")
    state = await saved(page)
    check("D9", "最小旧档通过文件选择器导入并补齐字段", state["points"] == 9 and all(isinstance(state[k], dict) for k in ("levels", "equipped", "taught", "settings", "daily", "play")))
    await import_file(page, {"points": 9, "charId": "invalid-character"}, "invalid-character.json")
    check("D6", "坏角色 ID 导入后回封面且顶栏无问号", (await saved(page))["charId"] is None and await page.locator(".pick__item").count() == 18 and "?" not in await page.locator("#topbar").inner_text())
    await page.context.close()
    broken = fixture()
    broken.update(owned={}, equipped=[], taught=[], levels={"A1": []}, settings=[], daily=None, play=[])
    page = await fresh(browser, broken)
    state = await saved(page)
    check("D10", "自动读取旧档形状容错且仍能开始练习", isinstance(state["owned"], list) and all(isinstance(state[k], dict) for k in ("levels", "equipped", "taught", "settings", "daily", "play")))
    await open_level(page, "A1")
    await press_cell(page, await next_cell(page))
    await page.get_by_role("button", name="结束", exact=True).click()
    check("D10", "修补后的对象可以继续落盘", isinstance(json.loads(await page.evaluate("localStorage.getItem('kzdt.v1.save')"))["levels"], dict))
    await page.context.close()

async def memory_and_offline(browser):
    page = await fresh(browser, memory=True)
    await choose(page)
    await settings(page)
    text = await page.locator("body").inner_text()
    check("S4a", "写入受阻时仅内存模式及顶部警告可见", "模式：仅内存（不会保存）" in text and "这台电脑禁止了本地存储" in text)
    async with page.expect_download() as event:
        await page.get_by_role("button", name="导出存档", exact=True).click()
    await (await event.value).save_as(str(OUT / "memory-save.json"))
    check("S4a", "仅内存模式允许实际下载备份", (OUT / "memory-save.json").stat().st_size > 0)
    await open_level(page, "A1")
    await press_cell(page, await next_cell(page))
    check("S4a", "仅内存模式仍接收真实键盘", await page.evaluate("KZ.Typing.session.correct") == 1)
    await page.context.close()
    ctx = await browser.new_context(accept_downloads=True)
    await ctx.set_offline(True)
    page = await ctx.new_page()
    await observe(page)
    start = time.monotonic()
    await page.goto(Path("E:/workspace/打字游戏/index.html").as_uri(), wait_until="load")
    await page.locator(".pick__item").nth(17).wait_for()
    elapsed = time.monotonic() - start
    check("S1", "浏览器模拟断网 file:// 首次页面加载", elapsed < 3 and await page.locator("#boot-error").is_hidden(), {"seconds": round(elapsed, 3), "url": page.url}, "浏览器模拟离线，未拔物理网络")
    await choose(page)
    await page.reload(wait_until="load")
    check("S4", "file:// 来源可写存储并刷新保留角色", await page.evaluate("KZ.Save.available && KZ.Save.data.charId==='c3'"), method="隔离 Chrome file:// 会话")
    await ctx.close()

async def keyboard_and_practice(browser):
    page = await fresh(browser, fixture(0, all_levels=True))
    await open_level(page, "A1")
    initial = await page.evaluate("KZ.Typing.session.correct+KZ.Typing.session.wrong")
    for key in ("Shift", "Control", "Backspace", "Enter", "ArrowLeft", "ArrowRight"):
        await page.keyboard.press(key)
    check("I6", "功能键不计错、不扣准确率", initial == await page.evaluate("KZ.Typing.session.correct+KZ.Typing.session.wrong"))
    cell = await next_cell(page)
    wrong_code = "KeyZ" if cell["code"] != "KeyZ" else "KeyX"
    await page.locator(f'[data-code="{wrong_code}"]').click()
    check("K5", "错键降低准确率、断连击并闪红", await page.evaluate("KZ.Typing.session.wrong===1 && KZ.Typing.session.combo===0") and await page.locator(f'[data-code="{wrong_code}"]').evaluate("e=>e.classList.contains('is-bad')"))
    await page.locator(f'[data-code="{wrong_code}"]').click()
    await page.locator(f'[data-code="{wrong_code}"]').click()
    check("K6", "三错跳过本条并显示两星封顶提示", await page.evaluate("KZ.Typing.session.skipped===1 && KZ.Typing.session.done===1") and "跳过了" in await page.locator(".hintline").inner_text())
    await finish_keys(page)
    check("K11", "完整练习跳过一条只奖励 18 分且 0 星", "+18 积分" in await page.locator("#overlay").inner_text() and await page.locator("#overlay .stars i.on").count() == 0)
    await page.get_by_role("button", name="回到地图", exact=True).click()
    await open_level(page, "A1")
    await page.get_by_role("button", name="结束", exact=True).click()
    check("K11 K13b", "空练习局 0 分，未过关按钮齐全", "+0 积分" in await page.locator("#overlay").inner_text() and await page.get_by_role("button", name="再来一次", exact=True).count() == 1 and await page.get_by_role("button", name="先练一练", exact=True).count() == 1)
    await page.get_by_role("button", name="回到地图", exact=True).click()
    await open_level(page, "A7", "challenge")
    for _ in range(300):
        cell = await next_cell(page)
        if re.fullmatch("[A-Z]", cell["ch"]): break
        await press_cell(page, cell)
    before = await page.evaluate("({correct:KZ.Typing.session.correct,wrong:KZ.Typing.session.wrong})")
    await press_cell(page, cell, use_shift=False)
    check("K7 G4", "A7 开启严格大写时小写判错", await page.evaluate("KZ.Typing.session.wrong") == before["wrong"] + 1)
    await press_cell(page, cell, use_shift=True)
    check("K7 K8 I1", "实际 Shift+物理键产生大写并判对", await page.evaluate("KZ.Typing.session.correct") == before["correct"] + 1)
    await settings(page)
    await page.locator("#overlay .row").filter(has_text="大写必须按 Shift").get_by_role("button").click()
    await page.get_by_role("button", name="关闭", exact=True).click()
    await open_level(page, "A7", "challenge")
    cell = await next_cell(page)
    await press_cell(page, cell, use_shift=False)
    check("K7 G4", "A7 关闭严格大写后小写判对", await page.evaluate("KZ.Typing.session.correct===1 && KZ.Typing.session.wrong===0"))
    await open_level(page, "A12", "challenge")
    for _ in range(400):
        cell = await next_cell(page)
        if cell["ch"] == "!": break
        await press_cell(page, cell)
    before = await page.evaluate("({correct:KZ.Typing.session.correct,wrong:KZ.Typing.session.wrong})")
    await press_cell(page, cell, use_shift=False)
    await press_cell(page, cell, use_shift=True)
    check("K8 G4", "关掉大小写仍不豁免 !，Shift+Digit1 判对", cell["ch"] == "!" and await page.evaluate("KZ.Typing.session.wrong") == before["wrong"] + 1 and await page.evaluate("KZ.Typing.session.correct") == before["correct"] + 1)
    await page.keyboard.press("F9")
    check("I3", "F9 打开键位日志", await page.locator("#keylog").is_visible())
    await page.keyboard.press("F9")
    check("I3", "F9 关闭键位日志", await page.locator("#keylog").is_hidden())
    await open_level(page, "A1")
    cell = await next_cell(page)
    key = cell["code"][-1].lower() if cell["code"].startswith("Key") else KEYS[cell["code"]]
    before = await page.evaluate("KZ.Typing.session.correct+KZ.Typing.session.wrong")
    await page.keyboard.down(key)
    await page.keyboard.down(key)
    await page.keyboard.up(key)
    check("I4", "自动化重复 keydown 不重复计分", await page.evaluate("KZ.Typing.session.correct+KZ.Typing.session.wrong") == before + 1, method="Chrome 自动化重复事件；非真机长按")
    await page.get_by_role("button", name="闯关地图", exact=True).click()
    await open_level(page, "A1")
    await page.evaluate("window.__qaKeyEvent=null;document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.code==='KeyR')setTimeout(()=>window.__qaKeyEvent={prevented:e.defaultPrevented,code:e.code},0)})")
    await page.keyboard.press("Control+r")
    await page.wait_for_timeout(100)
    event = await page.evaluate("window.__qaKeyEvent")
    check("I8", "应用未 preventDefault Ctrl+R", event is None or event["prevented"] is False, event, method="DOM 默认行为检查；原生快捷键真机待测")
    await page.reload(wait_until="networkidle")
    check("K14", "实际刷新后旧关卡监听被销毁", await page.evaluate("KZ.Scenes.name()==='map' && KZ.Typing.session===null"))
    await page.context.close()

async def settings_and_rest(browser):
    page = await fresh(browser, fixture())
    await page.get_by_role("button", name="服装商店", exact=True).first.click()
    await settings(page)
    for label, key in (("音效", "sfx"), ("朗读发音", "voice"), ("容易看的字母", "dys")):
        before = (await saved(page))["settings"][key]
        await page.locator("#overlay .row").filter(has=page.locator("b", has_text=re.compile("^" + label + "$"))).get_by_role("button").click()
        check("G1" if key == "sfx" else "G2" if key == "voice" else "G3", label + "按钮与存档同步", (await saved(page))["settings"][key] is not before, method="浏览器按钮/配置，未做人耳听感")
    seen = []
    row = page.locator("#overlay .row").filter(has_text="护眼提醒").get_by_role("button")
    for _ in range(5):
        await row.click()
        seen.append(await row.inner_text())
    check("G5", "护眼档位完整循环", seen == ["15 分钟", "20 分钟", "30 分钟", "45 分钟", "不提醒"], seen)
    await page.get_by_role("button", name="关闭", exact=True).click()
    check("G9", "商店打开设置关闭后返回商店", await page.locator(".shop").count() == 1)
    await settings(page)
    await page.get_by_role("button", name="现在休息一次", exact=True).click()
    await page.get_by_role("button", name="我休息好了", exact=True).wait_for()
    before_ack = (await saved(page))["play"]["restAck"]
    await page.wait_for_timeout(19100)
    check("G7", "真实倒计时第 19 秒仍不可确认", await page.get_by_role("button", name="我休息好了", exact=True).is_disabled())
    await page.wait_for_function("!document.querySelector('#overlay .overlay__acts button').disabled", timeout=3000)
    after = await saved(page)
    check("G7", "第 20 秒记录休息、清零时长并启用按钮", after["play"]["restAck"] > before_ack and after["play"]["activeMs"] == 0)
    await page.get_by_role("button", name="我休息好了", exact=True).click()
    await page.evaluate("KZ.Save.data.settings.restMin=15;KZ.Save.data.play.activeMs=300000;KZ.Save.data.play.restAck=Date.now()-16*60000;KZ.Save.save()")
    await open_level(page, "A1")
    await page.evaluate("KZ.Shell.autoRest()")
    check("G6", "达到提醒阈值时不打断 play", not await page.locator("#overlay").is_visible(), method="受控时长夹具 + 真实场景")
    await page.get_by_role("button", name="闯关地图", exact=True).click()
    await page.evaluate("KZ.Shell.autoRest()")
    check("G6", "相同阈值在地图场景弹休息框", await page.get_by_role("button", name="我休息好了", exact=True).count() == 1, method="受控时长夹具 + 真实场景")
    ack = (await saved(page))["play"]["restAck"]
    await page.evaluate("KZ.Scenes.go('map')")
    await page.wait_for_timeout(1100)
    check("G7", "提前换页取消倒计时且不记录休息", (await saved(page))["play"]["restAck"] == ack, method="受控换页")
    await page.context.close()

async def shop_and_arcade(browser):
    page = await fresh(browser, fixture(150, all_levels=True))
    await page.get_by_role("button", name="服装商店", exact=True).first.click()
    await page.wait_for_timeout(400)
    await page.get_by_role("button", name="职业体验", exact=True).click()
    await page.get_by_role("button", name="只买得起的", exact=True).click()
    check("H6", "买得起筛选仅当前主题未拥有且价格够的服装", await page.locator(".fit").count() == 1 and "小医生" in await page.locator(".fit").inner_text())
    await page.locator(".fit button").click()
    check("H6 C5", "购买后退出买得起筛选并保留主题", await page.locator(".world-tab.is-on").inner_text() == "职业体验" and (await saved(page))["equipped"]["c3"] == "o2")
    await page.get_by_role("button", name="全部", exact=True).click()
    await page.get_by_role("button", name="焰焰", exact=True).click()
    check("H3 H4", "缺图七件均禁售，默认造型免费可见", await page.get_by_role("button", name="画好才卖", exact=True).count() == 7 and all([await page.get_by_role("button", name="画好才卖", exact=True).nth(i).is_disabled() for i in range(7)]), await page.locator(".fit").count())
    await page.get_by_role("button", name="小星", exact=True).click()
    check("C5", "切换商店形象后仍记住各自穿戴", "现在穿着：小医生" in await page.locator(".dressup").inner_text())
    await page.evaluate("(()=>{window.__oldFallStart=KZ.Fall.start;KZ.Fall.start=function(h,w){return window.__qaFall=window.__oldFallStart(h,w)}})()")
    await page.get_by_role("button", name="自由练习", exact=True).click()
    for label in ("荷叶跳拼音", "单词陨石", "古诗飞花", "气球消字母"):
        await page.evaluate("window.__previousFall=__qaFall")
        await page.get_by_role("button", name=label, exact=True).click()
        check("A5", "切换 " + label + " 终止旧循环且只留一个画布", await page.evaluate("__previousFall.ended===true && __qaFall!==__previousFall") and await page.locator(".arcade canvas").count() == 1)
    for cap, expected in ((199, 1), (200, 0)):
        await page.evaluate("(n)=>{KZ.Save.data.daily.arcade=n;KZ.Save.data.daily.date=KZ.U.today();KZ.Save.save()}", cap)
        await page.wait_for_function("__qaFall.objs.some(o=>!o.dead)", timeout=8000)
        cell = await page.evaluate("()=>{let o=__qaFall.objs.filter(o=>!o.dead).sort((a,b)=>b.y-a.y)[0];return {code:o.chars[o.idx].code,ch:o.chars[o.idx].ch,strict:o.chars[o.idx].strict}}")
        await press_cell(page, cell)
        await page.wait_for_function("__qaFall.score>=1")
        await page.get_by_role("button", name="结束练习", exact=True).click()
        check("A4", "街机日上限 " + str(cap), f"+{expected} 积分" in await page.locator("#overlay").inner_text() and (await saved(page))["daily"]["arcade"] == 200, method="日累计夹具 + 实际击碎/结算")
        await page.get_by_role("button", name="再来一局", exact=True).click()
    await page.context.close()

async def poems_and_sprites(browser):
    page = await fresh(browser)
    await page.goto(URL + "qa-poems.html", wait_until="load")
    await page.wait_for_function("/^QA (PASS|FAIL|CRASH)/.test(document.title)", timeout=90000)
    text = await page.locator("#report").inner_text()
    (OUT / "poems-output.txt").write_text(text, encoding="utf-8")
    check("V7 T5 T6 T6b T6c W5", "既有诗词阁浏览器质检重跑", await page.title() == "QA PASS", {"title": await page.title(), "passed": len(re.findall(r"^PASS ", text, re.M)), "failed": len(re.findall(r"^FAIL ", text, re.M))}, "既有 QA 页面：虚拟键位与 rAF 定时器适配")
    await page.screenshot(path=str(OUT / "poems-report.png"), full_page=True)
    await page.goto(URL, wait_until="networkidle")
    sprites = await page.evaluate("""async()=>{
      let rows=[];window.__qaSprites={};
      for(let f of KZ.Costumes.flat){if(!KZ.Costumes.artReady(f.id))continue;
        let row=await new Promise(resolve=>KZ.Sprites.get(f.id,(res,meta)=>{
          if(res&&res.canvas)window.__qaSprites[f.id]=res.canvas;
          resolve({id:f.id,sourceAlpha:!!f.sourceAlpha,canvas:!!(res&&res.canvas),
            error:meta&&meta.error,keyError:meta&&meta.keyError,card:meta&&meta.card,autoCard:meta&&meta.autoCard,
            quality:KZ.Sprites.quality(meta),meta});}));rows.push(row);
      }return rows;
    }""")
    write("sprite-quality.json", sprites)
    failed = [x for x in sprites if not x["canvas"] or any(x.get(k) for k in ("error", "keyError", "card", "autoCard", "quality"))]
    check("R4", "全部 109 张已就绪立绘页面回调及数值质检", len(sprites) == 109 and not failed, {"ready": len(sprites), "failed": failed}, "实际素材 + 浏览器渲染回调")
    check("R2", "全部绿幕立绘背景 spread 阈值", all((x.get("meta") or {}).get("spread", 0) <= 120 for x in sprites if not x["sourceAlpha"]), method="实际素材数值检测；不含目视背景验收")
    for start in (1, 6, 11):
        data = await page.evaluate("""(start)=>{
          let c=document.createElement('canvas');c.width=1280;c.height=1000;let ctx=c.getContext('2d');
          for(let y=0;y<c.height;y+=12)for(let x=0;x<c.width;x+=12){ctx.fillStyle=((x/12+y/12)%2)?'#ddd':'#fff';ctx.fillRect(x,y,12,12)}
          for(let r=0;r<5;r++)for(let j=0;j<8;j++){let id='c'+(start+r)+'-o'+(j+1),im=__qaSprites[id];
            ctx.fillStyle='#111';ctx.font='16px sans-serif';ctx.fillText(id,j*160+8,r*200+18);
            if(im){let k=Math.min(150/im.width,170/im.height);ctx.drawImage(im,j*160+(160-im.width*k)/2,r*200+25,im.width*k,im.height*k);}
            else {ctx.fillStyle='#777';ctx.fillText('not ready',j*160+24,r*200+100)}
          }return c.toDataURL('image/png').split(',')[1];
        }""", start)
        import base64
        (OUT / f"sprites-{start}-{start+4}.png").write_bytes(base64.b64decode(data))
    await page.context.close()

async def persistent(browser_api):
    profile = OUT / "isolated-persistent-profile"
    ctx = await browser_api.chromium.launch_persistent_context(str(profile), channel="chrome", headless=True)
    page = ctx.pages[0]
    await observe(page)
    await page.goto(URL, wait_until="networkidle")
    if await page.locator(".pick__item").count(): await choose(page)
    await page.evaluate("KZ.Save.addPoints(9);KZ.Save.save()")
    expected = await saved(page)
    await ctx.close()
    ctx = await browser_api.chromium.launch_persistent_context(str(profile), channel="chrome", headless=True)
    page = ctx.pages[0]
    await page.goto(URL, wait_until="networkidle")
    actual = await saved(page)
    check("D8", "隔离普通浏览器关闭全部窗口后重新打开保留进度", all(expected[k] == actual[k] for k in ("charId", "points", "levels", "owned", "equipped", "settings")), {"profile": str(profile)})
    await ctx.close()

async def main():
    global PHASE
    async with async_playwright() as api:
        browser = await api.chromium.launch(channel="chrome", headless=True)
        write("environment.json", {"url": URL, "browser": browser.version, "viewport": [1440, 1000], "isolated_storage": True})
        selected = sys.argv[1:] if len(sys.argv) > 1 else []
        for name, function in (("full-flow", flow), ("save-edges", save_edges), ("memory-offline", memory_and_offline),
                ("keyboard-practice", keyboard_and_practice), ("settings-rest", settings_and_rest), ("shop-arcade", shop_and_arcade), ("poems-sprites", poems_and_sprites)):
            PHASE = name
            if selected and name not in selected:
                continue
            try:
                await function(browser)
            except Exception as exc:
                RESULTS.append({"ids": [], "name": name, "status": "HARNESS_ERROR", "detail": str(exc)})
                write("checks.json", RESULTS)
                print("HARNESS_ERROR", name, str(exc), flush=True)
            write("browser-events.json", EVENTS)
        PHASE = "persistent"
        try:
            await persistent(api)
        except Exception as exc:
            RESULTS.append({"ids": [], "name": "persistent", "status": "HARNESS_ERROR", "detail": str(exc)})
        await browser.close()
    ordinary = [e for e in EVENTS if e["phase"] not in ("memory-offline", "poems-sprites")]
    check("S2 V4", "普通 UI 全链路无 Console warning/error、页面异常和失败资源", not ordinary, ordinary)
    write("checks.json", RESULTS)
    write("browser-events.json", EVENTS)

if __name__ == "__main__":
    asyncio.run(main())

if __name__ == "__main__":
    import sys
    sys.exit(0 if RESULTS and all(x.get("status") == "PASS" for x in RESULTS) else 1)

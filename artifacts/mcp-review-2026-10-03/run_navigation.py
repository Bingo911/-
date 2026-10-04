import asyncio
import run_browser as qa
from playwright.async_api import async_playwright
qa.OUT=qa.ROOT/'navigation'
qa.OUT.mkdir(exist_ok=True)
qa.PHASE='navigation'

async def main():
    async with async_playwright() as api:
        browser=await api.chromium.launch(channel='chrome',headless=True)
        page=await qa.fresh(browser)
        await qa.choose(page)
        await page.locator('.node').nth(0).click()
        await page.get_by_role('button',name='先练一练（不限时）',exact=True).click()
        await page.get_by_role('button',name='先不练，回地图',exact=True).click()
        qa.check('T3','取消教学不记 taught/A0',not (await qa.saved(page))['taught'].get('A0'))
        await page.locator('.node').nth(1).click()
        await page.get_by_role('button',name='先练一练（不限时）',exact=True).click()
        qa.check('T3','取消 A0 后进入 A1 仍推荐指法图',await page.get_by_role('button',name='我准备好了，开始练',exact=True).count()==1,{'overlay_visible':await page.locator('#overlay').is_visible(),'taught':(await qa.saved(page))['taught'],'level':await page.evaluate('KZ.Typing.session && KZ.Typing.session.level.id')})
        await page.screenshot(path=str(qa.OUT/'T3-a1-with-teaching.png'),full_page=True,animations='disabled')
        qa.check('T3','教学确认前 A1 尚未计时启动',await page.evaluate('KZ.Typing.session===null'))
        await page.get_by_role('button',name='先不练，回地图',exact=True).click()
        qa.check('T3','取消 A1 推荐也不记教学',not (await qa.saved(page))['taught'].get('A0'))
        await page.locator('.node').nth(0).click()
        await page.get_by_role('button',name='先练一练（不限时）',exact=True).click()
        await page.get_by_role('button',name='我准备好了，开始练',exact=True).click()
        await page.get_by_role('button',name='闯关地图',exact=True).click()
        await page.locator('.node').nth(1).click()
        await page.get_by_role('button',name='先练一练（不限时）',exact=True).click()
        qa.check('T4','确认教学后 A1 不重复弹指法图',await page.get_by_role('button',name='我准备好了，开始练',exact=True).count()==0)
        await page.get_by_role('button',name='闯关地图',exact=True).click()
        for index,pre in ((1,'A4'),(2,'B4'),(3,'B18')):
            await page.locator('.worlds .world-tab').nth(index).click()
            content=await page.locator('#scene').inner_text()
            qa.check('M6','锁定世界 '+str(index)+' 的页签和地图说明',f'需要先通过 {pre}' in await page.locator('.worlds .world-tab').nth(index).inner_text() and pre in content and await page.locator('.node.node--locked').count()==await page.locator('.node').count(),content[:450])
        await page.context.close()
        await browser.close()
        edge=await api.chromium.launch(channel='msedge',headless=True)
        qa.write('edge-environment.json',{'version':edge.version,'channel':'msedge','scope':'封面/原生键盘练习/刷新存储冒烟，非完整全套'})
        page=await qa.fresh(edge)
        await qa.choose(page)
        await qa.open_level(page,'A0')
        await page.keyboard.press('a')
        qa.check('P2','Edge 原生键盘首次输入成功',await page.evaluate('KZ.Typing.session.correct')==1)
        before=await qa.saved(page)
        await page.reload(wait_until='networkidle')
        qa.check('P2 S4','Edge 本机存储刷新保留角色',await page.locator('.node').count()==13 and (await qa.saved(page))['charId']==before['charId'])
        await page.context.close()
        await edge.close()
        qa.write('checks.json',qa.RESULTS)
        qa.write('browser-events.json',qa.EVENTS)

if __name__=='__main__':asyncio.run(main())

if __name__ == "__main__":
    import sys
    sys.exit(0 if qa.RESULTS and all(x.get("status") == "PASS" for x in qa.RESULTS) else 1)

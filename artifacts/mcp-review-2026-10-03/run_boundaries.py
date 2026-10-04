import asyncio
import json
import time
import run_browser as qa
from playwright.async_api import async_playwright

qa.OUT = qa.ROOT / 'boundaries'
qa.OUT.mkdir(exist_ok=True)
qa.PHASE = 'controlled-boundaries'

async def score(browser, speed, accuracy, done_delta=0, skipped=0):
    page = await qa.fresh(browser, qa.fixture())
    await qa.open_level(page, 'A1', 'challenge')
    parameters = await page.evaluate('''()=>{let s=KZ.Typing.session;return {
      total:s.targets.length, par:s.level.par, acc:s.level.accGate,
      gate:KZ.Levels.gateCount(s.targets.map(t=>t.chars.length),s.level.unit,s.level.par[0],s.limit)}}''')
    await page.evaluate('''(p)=>{
      let s=KZ.Typing.session, original=s.done_;
      s.done_=function(r){window.__scoreResult=r;original(r)};
      let now=300000000;KZ.U.now=function(){return now};
      s.correct=Math.round(p.speed*p.accuracy*10);s.wrong=Math.round(p.speed*1000)-s.correct;
      s.done=p.done;s.pos=p.done;s.skipped=p.skipped;
      s.started=now-p.accuracy*600000;s.lastTick=now;
    }''', {'speed':speed,'accuracy':accuracy,'done':parameters['gate']+done_delta,'skipped':skipped})
    await page.wait_for_function('window.__scoreResult')
    result = await page.evaluate('__scoreResult')
    await page.context.close()
    return {'parameters':parameters,'input':{'speed':speed,'accuracy':accuracy,'done_delta':done_delta,'skipped':skipped},'result':result}

async def scores(browser):
    for delta, expected in ((-1,0),(0,3)):
        row=await score(browser,40,100,delta)
        qa.check('K9a','A1 完成门槛 '+str(delta),row['result']['stars']==expected,row,'浏览器真实结算轮询 + 整数计数/受控时钟夹具')
    for tier,(speed,acc) in enumerate(zip((15,22,30),(80,86,92)),1):
        for kind,sp,ac,expected in (('恰好达标',speed,acc,tier),('速度略低',speed-.1,acc,tier-1),('准确率略低',speed,acc-.1,tier-1)):
            row=await score(browser,sp,ac)
            qa.check('K9b',f'A1 {tier} 星 {kind}',row['result']['stars']==expected,row,'浏览器真实结算轮询 + 受控指标夹具；不是人工限速输入')
    row=await score(browser,40,100,skipped=1)
    qa.check('K9b K6','其他条件三星、有跳过时封顶两星',row['result']['stars']==2,row,'浏览器真实结算 + 跳过计数夹具')

async def progress(browser):
    for mode in ('practice','challenge'):
        page=await qa.fresh(browser,qa.fixture())
        await qa.open_level(page,'A1',mode)
        for percentage in (80,80.1):
            await page.evaluate('''(p)=>{let s=KZ.Typing.session,now=900000;
              KZ.U.now=function(){return now};s.lastTick=now;
              if(s.mode==='challenge'){s.started=now-s.limit*1000*p/100;s.done=0;}
              else{s.targets=Array(1000).fill(s.targets[0]);s.pos=Math.round(p*10);s.done=s.pos;}
            }''',percentage)
            await page.wait_for_timeout(300)
            row=await page.locator('.meter__fill').evaluate('e=>({width:e.style.width,warn:e.classList.contains("warn")})')
            qa.check('K3',f'{mode} 进度 {percentage}% 警示色',row['warn']==(percentage>80),row,'浏览器轮询 + 受控时钟/目标计数夹具')
        await page.context.close()

async def other_boundaries(browser):
    for own_all in (True,False):
        data=qa.fixture(150)
        if own_all:data['owned']=['c3-o'+str(i) for i in range(1,9)]
        page=await qa.fresh(browser,data)
        await qa.open_level(page,'A1')
        await page.get_by_role('button',name='结束',exact=True).click()
        content=await page.locator('#overlay').inner_text()
        qa.check('K13c','仅当前角色推荐且选择最便宜服装 '+str(own_all),('商店里有你能买' not in content) if own_all else ('小医生' in content and '120 积分' in content),content,'拥有列表夹具 + 真实练习结算')
        await page.context.close()
    data=qa.fixture(150,'c14');data['owned'].append('c14-o2')
    page=await qa.fresh(browser,data)
    await page.get_by_role('button',name='服装商店',exact=True).first.click()
    button=page.locator('.fit').nth(1).get_by_role('button')
    qa.check('H3','旧档已拥有缺图服装允许选择穿戴',not await button.is_disabled(),await button.inner_text())
    await button.click()
    qa.check('H3','已拥有缺图服装穿戴保存且仍显示占位',(await qa.saved(page))['equipped']['c14']=='o2' and await page.locator('.fit__ph--miss').count()==7)
    await page.context.close()
    page=await qa.fresh(browser,qa.fixture())
    await qa.open_level(page,'A0')
    await page.keyboard.press('a')
    await page.wait_for_timeout(30)
    # The target is now s. Two events in one JS task exercise the real debounce listener.
    result=await page.evaluate('''()=>{let s=KZ.Typing.session,b=s.correct,w=s.wrong;
      for(let i=0;i<2;i++)window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyS',key:'s',bubbles:true,cancelable:true}));
      return {correctDelta:s.correct-b,wrongDelta:s.wrong-w};}''')
    qa.check('I5','同键同任务两次事件只处理一次',result['correctDelta']==1 and result['wrongDelta']==0,result,'合成 DOM 事件；不替代物理键盘抖动')
    result=await page.evaluate('''()=>{let s=KZ.Typing.session,b=s.correct,w=s.wrong;
      KZ.Keys.virtual('KeyD',false);KZ.Keys.virtual('KeyF',false);
      return {correctDelta:s.correct-b,wrongDelta:s.wrong-w};}''')
    qa.check('I5 I7','屏幕键盘通路同任务连续输入不受真实键防抖',result['correctDelta']==2 and result['wrongDelta']==0,result,'实际 virtual/dispatch 通路；MCP 已另测真实鼠标点击')
    await page.context.close()
    data=qa.fixture();old=int(time.time()*1000)-9*3600000
    data['play']={'activeMs':600000,'lastTick':old,'restAck':old};data['settings']['restMin']=15
    data['daily']={'date':'2026-10-02','arcade':200,'firstBonus':True}
    page=await qa.fresh(browser,data)
    now=await qa.saved(page)
    qa.check('G8','隔夜九小时旧档连续时长清零且不立即提醒',now['play']['activeMs']==0 and now['play']['restAck']>old and not await page.locator('#overlay').is_visible(),now['play'],'隔夜时间戳夹具 + 实际重载')
    await page.get_by_role('button',name='自由练习',exact=True).click()
    await page.wait_for_function("KZ.Save.data.daily.date!=='2026-10-02'")
    now=await qa.saved(page)
    qa.check('A4','次日进入街机重置额度',now['daily']['arcade']==0 and now['daily']['date']!='2026-10-02',now['daily'],'前一日存档夹具 + 真实进入街机及 tickPlay')
    await page.context.close()

async def timeout_page(browser):
    page=await qa.fresh(browser,qa.fixture())
    await qa.open_level(page,'A1','challenge')
    start=time.monotonic()
    await page.wait_for_function('KZ.Typing.session===null && document.querySelector("#overlay .stars")',timeout=65000)
    elapsed=time.monotonic()-start
    row={'elapsed_seconds':round(elapsed,3),'stars':await page.locator('#overlay .stars i.on').count(),
      'remaining':await page.locator('.play__stat:nth-child(3) b').inner_text(),
      'progress':await page.locator('.meter__fill').evaluate('e=>e.style.width')}
    qa.check('K9 K2','A1 实际等待 60 秒自动结算空局',elapsed>=59 and row['stars']==0 and row['remaining']=='0' and row['progress']=='100%',row,'未经时钟修改的真实 60 秒浏览器计时')
    await page.context.close()

async def final_sprite_sheet(browser):
    page=await qa.fresh(browser)
    data=await page.evaluate('''async()=>{
      let c=document.createElement('canvas');c.width=1280;c.height=600;let x=c.getContext('2d');
      for(let y=0;y<c.height;y+=12)for(let z=0;z<c.width;z+=12){x.fillStyle=(y/12+z/12)%2?'#ddd':'#fff';x.fillRect(z,y,12,12)}
      for(let r=0;r<3;r++)for(let j=0;j<8;j++){let id='c'+(16+r)+'-o'+(j+1);x.fillStyle='#111';x.font='16px sans-serif';x.fillText(id,j*160+8,r*200+18);
        if(!KZ.Costumes.artReady(id)){x.fillText('not ready',j*160+24,r*200+100);continue;}
        let res=await new Promise(resolve=>KZ.Sprites.get(id,resolve));let im=res.canvas,k=Math.min(150/im.width,170/im.height);
        x.drawImage(im,j*160+(160-im.width*k)/2,r*200+25,im.width*k,im.height*k);
      }return c.toDataURL('image/png').split(',')[1];}''')
    import base64
    (qa.OUT/'sprites-16-18.png').write_bytes(base64.b64decode(data))
    await page.context.close()

async def main():
    async with async_playwright() as api:
        browser=await api.chromium.launch(channel='chrome',headless=True)
        import sys
        selected=sys.argv[1:]
        timer=asyncio.create_task(timeout_page(browser)) if not selected else None
        for name,fn in [('scores',scores),('progress',progress),('other-boundaries',other_boundaries),('final-sprite-sheet',final_sprite_sheet)]:
            if selected and name not in selected:continue
            try:await fn(browser)
            except Exception as e:
                qa.RESULTS.append({'ids':[],'name':name,'status':'HARNESS_ERROR','detail':str(e)})
                print('HARNESS_ERROR',name,str(e),flush=True)
        if timer:await timer
        qa.write('checks.json',qa.RESULTS)
        qa.write('browser-events.json',qa.EVENTS)
        await browser.close()

if __name__=='__main__':asyncio.run(main())

if __name__ == "__main__":
    import sys
    sys.exit(0 if qa.RESULTS and all(x.get("status") == "PASS" for x in qa.RESULTS) else 1)

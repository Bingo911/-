/* 独立逻辑回归。浏览器 UI 由自动化测试用例.md 另行验证。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts', 'qa-2026-10-02-regression');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
function test(id, name, fn) {
  try { const detail = fn(); results.push({ id, name, status: 'PASS', detail }); }
  catch (e) { results.push({ id, name, status: 'FAIL', error: e.stack }); }
}
function game(seed, blocked = false) {
  const disk = seed ? { 'kzdt.v1.save': JSON.stringify(seed) } : {};
  let writes = 0;
  const ctx = vm.createContext({ document: { hidden: false }, localStorage: {
    getItem(k) { return disk[k] ?? null; },
    setItem(k, v) { if (blocked) throw Error('storage blocked'); disk[k] = String(v); writes++; },
    removeItem(k) { delete disk[k]; }
  } });
  /* 29-data-poems 必须在 25-data-levels 之前：世界 D 的关卡是 build() 时从 KZ.Poems 现推的，
     漏了它这里就只测 46 关，诗词阁那 75 关从头到尾没人跑过。 */
  for (const name of ['00-util','20-ime','26-data-pinyin','27-data-words','28-data-costumes','29-data-poems','25-data-levels','10-state','50-engine-typing']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', name + '.js'), 'utf8'), ctx, { filename: name });
  }
  ctx.KZ.Save.init();
  return { K: ctx.KZ, ctx, disk, writes: () => writes };
}

/* 独立 VM 使用最小 DOM，运行真实场景结算和顶栏渲染。
   引擎结束回调由夹具提供，不把这些断言冒充浏览器逐键测试。 */
function sceneGame() {
  const g = game(), { K, ctx } = g;
  function element(tag) {
    const e = { nodeType:1, tagName:tag, children:[], style:{}, className:'', textContent:'',
      addEventListener() {}, removeEventListener() {},
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; },
      get firstChild() { return this.children[0]; }, get lastChild() { return this.children[this.children.length - 1]; }
    };
    e.classList = { add() {}, remove() {}, toggle() {} }; return e;
  }
  const nodes = {};
  ctx.document = { hidden:false, createElement:element,
    getElementById(id) { return nodes[id] || (nodes[id] = element('div')); }, body:element('body') };
  ctx.setInterval = () => 1; ctx.clearInterval = () => {}; ctx.setTimeout = () => 1;
  K.Sprites = { badge() {} };
  K.Tts = { stop() {}, speak() {}, available:() => true, pending:() => false };
  K.Sfx = { clear() {}, fail() {} };
  let finish, reward;
  K.Typing.open = options => { finish = options.onFinish; };
  K.Typing.discard = () => {};
  K.Reward = { show(res, lv, outcome) { reward = { res, outcome, header:header() }; } };
  for (const name of ['40-ui-shell', '60-scenes']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', name + '.js'), 'utf8'), ctx, { filename:name });
  }
  K.Save.setChar('c3'); K.Shell.init();
  function header() {
    const children = nodes.topbar.children;
    return {
      points:Number(children.find(e => e.className.includes('pill--gold')).lastChild.textContent),
      stars:children.find(e => e.className.includes('pill--star')).lastChild.textContent
    };
  }
  return { ...g, header, run(mode, res) {
    K.Scenes.playLevel('A1', mode);
    finish({ levelId:'A1', mode, stars:0, done:0, total:12, correct:0, skipped:0,
      acc:100, speed:100, maxCombo:20, score:300, ...res });
    return reward;
  } };
}
test('N01', '现有关卡/经济/161 种坏档校验', () => {
  const r = spawnSync(process.execPath, ['tools/validate-levels.js'], { cwd: ROOT, encoding: 'utf8' });
  fs.writeFileSync(path.join(OUT, 'validator-output.txt'), (r.stdout || '') + (r.stderr || ''), 'utf8');
  assert.equal(r.status, 0, r.stdout + r.stderr); return { exitCode: r.status };
});
test('N02', '全部关卡练习/挑战目标数量', () => {
  const { K } = game();
  const byWorld = {};
  for (const lv of K.Levels.all()) byWorld[lv.world] = (byWorld[lv.world] || 0) + 1;
  assert.deepEqual(byWorld, { A: 13, B: 18, C: 15, D: K.Poems.list.length }, '各世界关数');
  assert.equal(byWorld.D, 75, '诗词阁应一关一首，75 关');
  for (const lv of K.Levels.all()) {
    const before = JSON.stringify(lv.raw);
    assert.equal(lv.targetsList('practice').length, Math.min(12, lv.raw.length), lv.id);
    assert.equal(lv.targetsList('challenge').length, lv.raw.length, lv.id);
    assert.equal(JSON.stringify(lv.raw), before);
  }
});
test('N03', '所有关卡目标都可映射到实际键位', () => {
  const { K } = game(); let targets = 0, characters = 0;
  for (const lv of K.Levels.all()) for (const item of lv.raw) {
    /* 诗词阁的目标是 {t, h}：要打的是 t 那串拼音，h 只是题干。
       直接拿对象当字符串比长度，会得到 chars.length !== undefined 这种没意义的断言。 */
    const text = K.Levels.targetStr(item);
    const t = K.Typing.buildTarget(item);
    assert.equal(t.chars.length, text.length, lv.id + ':' + text);
    assert.ok(t.chars.length, lv.id + ' 空目标');
    for (const cell of t.chars) assert.ok(cell.code);
    targets++; characters += text.length;
  }
  return { targets, characters };
});
test('N04', '正确键/错误键/Shift 与符号判定', () => {
  const { K } = game(); const E = K.Typing;
  const a = E.buildTarget('a').chars[0], A = E.buildTarget('A').chars[0], bang = E.buildTarget('!').chars[0];
  assert.ok(E.accepts(a, { code:'KeyA', ev:'a' }, false));
  assert.equal(E.accepts(a, { code:'KeyS', ev:'s' }, false), false);
  assert.equal(E.accepts(A, { code:'KeyA', ev:'a' }, false), false);
  assert.ok(E.accepts(A, { code:'KeyA', ev:'A' }, false));
  assert.ok(E.accepts(A, { code:'KeyA', ev:'a' }, true));
  assert.equal(E.accepts(bang, { code:'Digit1', ev:'1' }, true), false);
  assert.ok(E.accepts(bang, { code:'Digit1', ev:'!' }, true));
});
test('N05', '初始和跨世界解锁', () => {
  const { K } = game(), S = K.Save;
  for (const id of ['A0','A1']) assert.ok(K.Levels.isUnlocked(id, S));
  for (const id of ['A2','B1','C1','D1']) assert.equal(K.Levels.isUnlocked(id, S), false);
  for (const [prev, next] of [['A1','A2'],['A4','B1'],['B4','C1'],['B18','D1']]) {
    S.data.levels[prev] = { stars: 1 }; assert.ok(K.Levels.isUnlocked(next, S));
  }
});
test('N06', '最小旧档补齐与导出导入往返', () => {
  const { K } = game(); assert.ok(K.Save.importText('{"points":9,"charId":"c3"}'));
  const text = K.Save.toJSON(), other = game().K.Save;
  assert.ok(other.importText(text)); assert.equal(other.toJSON(), text);
  assert.equal(other.data.points, 9); assert.equal(other.data.charId, 'c3');
  for (const f of ['levels','equipped','taught','settings','daily','play']) assert.ok(other.data[f]);
  assert.ok(Array.isArray(other.data.owned));
});
test('N07', '坏档拒绝不改变内存与持久化', () => {
  const { K, disk, writes } = game(); const S = K.Save;
  assert.ok(S.importText('{"points":321,"charId":"c3"}'));
  const bad = ['bad','null','[]','{}','{"points":-1}','{"points":1e400}','{"points":"5"}'];
  for (const field of ['levels','equipped','taught','settings','daily','play','owned'])
    for (const value of [null, 2, 'x', true]) bad.push(JSON.stringify({ points: 5, [field]: value }));
  bad.push('{"points":5,"levels":{"A1":[]}}','{"points":5,"settings":{"voice":[]}}');
  for (const text of bad) {
    const ref = S.data, before = S.toJSON(), storage = JSON.stringify(disk), count = writes();
    assert.equal(S.importText(text), false, text); assert.equal(S.data, ref);
    assert.equal(S.toJSON(), before); assert.equal(JSON.stringify(disk), storage); assert.equal(writes(), count);
  }
  return { fixtures: bad.length };
});
test('N08', '99 星夹值和非法角色修复', () => {
  const { K } = game(); assert.ok(K.Save.importText('{"points":9,"charId":"invalid","levels":{"A1":{"stars":99}}}'));
  assert.equal(K.Save.stars('A1'), 3); assert.equal(K.Save.data.charId, null);
});
test('N09', '存储失败降级仍保留本局进度', () => {
  const { K } = game(null, true); assert.equal(K.Save.mode(), 'memory');
  assert.ok(K.Save.importText('{"points":7}')); assert.equal(K.Save.data.points, 7);
});
test('N10', '购买幂等与角色独立换装', () => {
  const { K } = game(), S = K.Save; S.setChar('c3'); S.addPoints(500);
  assert.ok(S.buy('c3-o2', 120)); assert.equal(S.data.points, 380);
  assert.equal(S.buy('c3-o2', 120), false); assert.equal(S.data.points, 380);
  assert.equal(S.buy('c3-o8', 760), false); assert.equal(S.data.points, 380);
  S.equip('c3','o2'); S.setChar('c4'); S.equip('c4','o1'); S.setChar('c3');
  assert.equal(S.equippedOf('c3'), 'o2'); assert.equal(S.equippedOf('c4'), 'o1');
});
test('N11', '参与奖、首通、重玩与星数不降', () => {
  const { K } = game(), S = K.Save;
  const base = { levelId:'A1', stars:0, done:0, correct:0, acc:100, speed:500, maxCombo:20, score:0 };
  assert.equal(S.recordRun('A1', base).gained, 0);
  assert.equal(S.recordRun('A1', { ...base, done:1, correct:15 }).gained, 10);
  const win = { ...base, stars:3, done:99, correct:99, score:300 };
  const first = S.recordRun('A1', win), repeat = S.recordRun('A1', win);
  assert.ok(first.gained >= 40); assert.ok(repeat.gained < first.gained);
  S.recordRun('A1', { ...win, stars:1 }); assert.equal(S.stars('A1'), 3);
  return { first: first.gained, repeat: repeat.gained };
});
test('N12', '跨日奖励/街机和隔夜计时归零', () => {
  const { K } = game({ points:5, daily:{ date:'2000-01-01', firstBonus:true, arcade:200 }, play:{ activeMs:999999, lastTick:1, restAck:1 } });
  K.Save.rollDaily(); assert.equal(K.Save.data.daily.firstBonus, false); assert.equal(K.Save.data.daily.arcade, 0);
  assert.equal(K.Save.data.play.activeMs, 0); assert.ok(K.Save.data.play.restAck > 1);
});
test('N13', '挑战结算奖励出现前顶栏已同步，且不重复记账', () => {
  const g = sceneGame(), S = g.K.Save, cases = [
    { stars:0, done:0, correct:0 },
    { stars:0, done:1, correct:15 },
    { stars:1, done:12, correct:30 },
    { stars:1, done:12, correct:30 },
    { stars:3, done:12, correct:30 }
  ];
  const details = [];
  for (const input of cases) {
    const before = S.data.points, tries = S.data.levels.A1?.tries || 0;
    const result = g.run('challenge', input);
    assert.equal(result.header.points, S.data.points, '结算已出现而顶栏积分仍旧');
    assert.equal(result.header.stars, S.totalStars() + '/' + g.K.Levels.totalStarsPossible(), '结算已出现而顶栏星数仍旧');
    assert.equal(S.data.points - before, result.outcome.gained, '同步显示重复发奖');
    assert.equal(S.data.levels.A1.tries, tries + 1, '一局记账多次');
    const paid = S.data.points; g.K.Shell.bumpPoints(); g.K.Shell.renderTopbar();
    assert.equal(S.data.points, paid, '再次刷新顶栏重复记账');
    details.push({ input, points:result.header.points, stars:result.header.stars, gained:result.outcome.gained });
  }
  return { cases:details };
});
test('N14', '练习积分只奖励完整输入，跳过/空局/半条不发分', () => {
  const cases = [
    { input:{}, gained:0 },
    { input:{ correct:1, done:0 }, gained:0 },
    { input:{ correct:1, done:1 }, gained:4 },
    { input:{ correct:6, done:6 }, gained:10 },
    { input:{ correct:11, done:12, skipped:1 }, gained:18 },
    { input:{ correct:1, done:12, skipped:12 }, gained:0 },
    { input:{ correct:12, done:12 }, gained:20 }
  ];
  for (const fixture of cases) {
    const g = sceneGame(), S = g.K.Save;
    const before = S.toJSON(), result = g.run('practice', fixture.input);
    assert.equal(result.outcome.gained, fixture.gained, JSON.stringify(fixture.input));
    assert.equal(result.header.points, fixture.gained);
    /* 这里要查的是顶栏在结算前就跟着刷新了，不是那个总数：
       写死 138 的话，加一个世界就来改一次数字，改漏一次就是把真问题当失败。 */
    assert.equal(result.header.stars, '0/' + g.K.Levels.totalStarsPossible());
    assert.equal(JSON.stringify(S.data.levels), '{}', '练习误写星级/通关记录');
    assert.equal(g.K.Levels.isUnlocked('A2', S), false, '练习误解锁下一关');
    if (!fixture.gained) assert.equal(S.toJSON(), before);
  }
  return { cases };
});
test('N15', '世界 D「看汉字打拼音」的目标与判定', () => {
  const { K } = game();
  const lv = K.Levels.get('D18'), p = K.Poems.byNo[18];
  assert.equal(lv.world, 'D'); assert.equal(lv.unit, 'syll');
  assert.equal(lv.blind, true, '挑战模式必须盖住拼音，否则这一关是抄写');
  assert.equal(lv.shuffle, false, '目标顺序就是诗的顺序');
  const first = K.Typing.buildTarget(lv.raw[0]);
  assert.equal(first.text, p.lines[0][1].split(' ')[0], '要打的第一个拼音');
  assert.equal(first.hz, p.lines[0][0].charAt(0), '题干的第一个汉字');
  assert.equal(first.poem, p.title);
  assert.ok(first.line.indexOf('床前明月光') >= 0, '整句题干要挂上，孩子才知道打到哪儿');
  /* 键位来自拼音而不是汉字：'chuang' 就是六个字母六个键。
     codes 是另一个 VM  realm 造出来的数组，deepEqual 会比原型，只能按值比。 */
  assert.equal(first.codes.slice(0, 3).join(','), 'KeyC,KeyH,KeyU');
  assert.ok(K.Typing.accepts(first.chars[0], { code: 'KeyC', ev: 'c' }, false));
  assert.equal(K.Typing.accepts(first.chars[0], { code: 'KeyB', ev: 'b' }, false), false);
  /* ü 必须真的出现在诗词阁：V 键那条规则不然就只在拼音谷被验证过 */
  const hasUmlaut = K.Levels.byWorld('D').some(l => l.raw.some(t => K.Levels.targetStr(t).indexOf('ü') >= 0));
  assert.ok(hasUmlaut, '世界 D 没有带 ü 的音节');
  /* 一关一首：条数 = 这首诗的汉字数，每条都带着自己的题干 */
  for (const l of K.Levels.byWorld('D')) {
    const poem = K.Poems.byNo[Number(l.id.slice(1))];
    const hzCount = poem.lines.reduce((n, line) => n + (line[0].match(/[㐀-鿿]/g) || []).length, 0);
    assert.equal(l.raw.length, hzCount, l.id + ' 条数与这首诗的字数不等');
    for (const t of l.raw) {
      assert.ok(t.h && /[㐀-鿿]/.test(t.h), l.id + ' 有目标缺汉字题干');
      assert.ok(K.Typing.buildTarget(t).chars.length === t.t.length, l.id + ' 拼音拆不出键位：' + t.t);
    }
  }
  const S = K.Save;
  assert.equal(K.Levels.isUnlocked('D1', S), false);
  S.data.levels.B18 = { stars: 1 };
  assert.ok(K.Levels.isUnlocked('D1', S), '拼音结业后诗词阁应当开启');
  return { dLevels: K.Levels.byWorld('D').length };
});
const report = { timestamp: new Date().toISOString(), node: process.version, root: ROOT, results,
  passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length };
fs.writeFileSync(path.join(OUT, 'node-results.json'), JSON.stringify(report, null, 2), 'utf8');
for (const r of results) console.log(`${r.status} ${r.id} ${r.name}${r.error ? '\n' + r.error : ''}`);
console.log(`TOTAL ${report.passed} PASS / ${report.failed} FAIL`);
process.exitCode = report.failed ? 1 : 0;

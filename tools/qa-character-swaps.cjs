/* 角色替换后的旧存档兼容回归：node tools/qa-character-swaps.cjs */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts/character-swaps-2026-10-02');
function game(old) {
  const ctx = vm.createContext({ document:{ hidden:false }, localStorage:{ getItem:() => null, setItem() {} } });
  for (const name of ['00-util','20-ime','26-data-pinyin','27-data-words','28-data-costumes','25-data-levels','10-state']) {
    const file = old && name === '28-data-costumes' ? path.join(OUT, 'costumes-before.js') : path.join(ROOT, 'js', name + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  }
  ctx.KZ.Save.init(); return ctx.KZ;
}
const current = game(false);
const before = JSON.parse(fs.readFileSync(path.join(OUT, 'costumes-before.json'), 'utf8'));
const after = JSON.parse(JSON.stringify(current.Costumes.flat.map(x => ({ id:x.id, charId:x.charId, price:x.price, theme:x.theme, src:x.src }))));
assert.deepEqual(after, before, '角色或服装编号、价格、主题及素材路径发生变化');
assert.equal(current.Costumes.char('c9').name, '熊二');
assert.equal(current.Costumes.char('c13').name, '阿奇');
assert.equal(current.Costumes.char('c8').name, '皮卡丘');
assert.equal(current.Costumes.char('c10').name, '竹豆');
const cases = [];
for (const id of ['c9','c13']) {
  const old = game(true);
  old.Save.setChar(id); old.Save.addPoints(10000);
  for (const outfit of old.Costumes.ofChar(id)) {
    if (!outfit.default) assert.equal(old.Save.buy(outfit.id, outfit.price), true);
  }
  for (let i = 1; i <= 8; i++) {
    old.Save.equip(id, 'o' + i);
    const snapshot = JSON.parse(old.Save.toJSON());
    const imported = game(false);
    assert.equal(imported.Save.importText(JSON.stringify(snapshot)), true);
    assert.equal(imported.Save.data.charId, id);
    assert.equal(imported.Save.data.points, snapshot.points);
    assert.deepEqual(Array.from(imported.Save.data.owned), snapshot.owned);
    assert.equal(imported.Save.equippedOf(id), 'o' + i);
    assert.equal(imported.Costumes.artReady(id + '-o' + i), true);
    cases.push({ charId:id, equipped:'o' + i, status:'PASS' });
  }
}
fs.writeFileSync(path.join(OUT, 'compatibility-results.json'), JSON.stringify({ timestamp:new Date().toISOString(), metadata:'PASS', cases }, null, 2));
console.log('PASS 全部 144 件服装的编号、价格、主题及路径保持一致');
console.log('PASS 熊二、阿奇 16 种旧存档穿戴组合，积分和已购服装完整保留');

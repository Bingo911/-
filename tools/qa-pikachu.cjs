/* 皮卡丘替换的素材与存档兼容回归：node tools/qa-pikachu.cjs */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts/pikachu-2026-10-02');
function game(old) {
  const ctx = vm.createContext({ document:{ hidden:false }, localStorage:{ getItem:() => null, setItem() {} } });
  for (const name of ['00-util','20-ime','26-data-pinyin','27-data-words','28-data-costumes','25-data-levels','10-state']) {
    const file = old && name === '28-data-costumes' ? path.join(OUT, 'costumes-before.js') : path.join(ROOT, 'js', name + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  }
  ctx.KZ.Save.init(); return ctx.KZ;
}
const current = game(false), old = game(true);
const metadata = KZ => JSON.parse(JSON.stringify(KZ.Costumes.flat.map(x => ({ id:x.id, charId:x.charId, price:x.price, theme:x.theme, src:x.src }))));
assert.deepEqual(metadata(current), metadata(old));
assert.equal(current.Costumes.char('c8').name, '皮卡丘');
for (const ch of current.Costumes.chars) {
  if (ch.id !== 'c8') assert.deepEqual(JSON.parse(JSON.stringify(ch)), JSON.parse(JSON.stringify(old.Costumes.char(ch.id))));
}
const candidates = ['candidates/Pikachu-Transparent-Background.png','candidates/Pikachu-PNG-Photos.png','candidates/detective-main.png','candidates/Pikachu-PNG-Clipart.png','candidates/Pikachu-PNG-Image.png','candidates/Pikachu-PNG-File.png','candidates/Pikachu-PNG-HD.png','candidates/tea.png'];
const assets = current.Costumes.ofChar('c8').map((outfit, i) => {
  const data = fs.readFileSync(path.join(ROOT, outfit.src));
  assert.deepEqual(data, fs.readFileSync(path.join(OUT, candidates[i])), '图片必须是下载的原图');
  assert.notDeepEqual(data, fs.readFileSync(path.join(OUT, 'originals', 'c8_o' + (i + 1) + '.png')));
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(outfit.sourceAlpha, true);
  assert.equal(current.Costumes.artReady(outfit.id), true);
  return { id:outfit.id, name:outfit.name, sha256:crypto.createHash('sha256').update(data).digest('hex') };
});
old.Save.setChar('c8'); old.Save.addPoints(10000);
for (const outfit of old.Costumes.ofChar('c8')) if (!outfit.default) assert.equal(old.Save.buy(outfit.id, outfit.price), true);
const cases = [];
for (let i = 1; i <= 8; i++) {
  old.Save.equip('c8', 'o' + i);
  const snapshot = JSON.parse(old.Save.toJSON());
  const imported = game(false);
  assert.equal(imported.Save.importText(JSON.stringify(snapshot)), true);
  assert.equal(imported.Save.data.charId, 'c8');
  assert.equal(imported.Save.data.points, snapshot.points);
  assert.deepEqual(Array.from(imported.Save.data.owned), snapshot.owned);
  assert.equal(imported.Save.equippedOf('c8'), 'o' + i);
  cases.push({ equipped:'o' + i, status:'PASS' });
}
fs.writeFileSync(path.join(OUT, 'compatibility-results.json'), JSON.stringify({ timestamp:new Date().toISOString(), metadata:'PASS', assets, cases }, null, 2));
console.log('PASS 全部 144 件服装的编号、价格、主题及路径保持一致，其他角色配置保持一致');
console.log('PASS 8 张现成皮卡丘原图完整接入，启用原生透明通道');
console.log('PASS 小雷 8 种旧存档穿戴组合，积分与已购服装完整保留');

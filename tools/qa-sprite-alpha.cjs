/* 原生 PNG 透明度回归：node tools/qa-sprite-alpha.cjs */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const W = 96, H = 96;
const pixels = new Uint8ClampedArray(W * H * 4);
for (let y = 24; y < 72; y++) for (let x = 24; x < 72; x++) {
  const p = (y * W + x) * 4;
  pixels.set(x < 48 ? [10,210,30,255] : [5,5,5,255], p);
}
for (const [x, alpha] of [[30,1],[31,20],[32,40],[33,128],[34,200]]) pixels.set([220,230,250,alpha], (30 * W + x) * 4);
pixels.set([180,80,30,0], (2 * W + 2) * 4); // 透明像素中的隐藏 RGB 也不能变成不透明噪点。
function render(file, sourceAlpha) {
  let written, output, metadata;
  const ctx = vm.createContext({ KZ:{ U:{ el(tag) {
    if (tag === 'img') {
      const img = { naturalWidth:W, naturalHeight:H };
      Object.defineProperty(img, 'src', { set() { img.onload(); } }); return img;
    }
    return { getContext() { return { drawImage() {},
      getImageData() { return { data:new Uint8ClampedArray(pixels) }; },
      putImageData(im) { written = new Uint8ClampedArray(im.data); } }; } };
  } }, Costumes:{ byId() { return { src:'fixture.png', spriteH:360, sourceAlpha }; } } } });
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx);
  ctx.KZ.Sprites.get('fixture', (res, meta) => { output = res; metadata = meta; });
  return { written, output, metadata, quality:ctx.KZ.Sprites.quality };
}
const native = render('js/35-sprite.js', true);
assert.deepEqual(native.written, pixels, '绿色、黑色或透明像素被修改');
assert.equal(native.metadata.sourceAlpha, true);
assert.ok(native.output.canvas);
assert.equal(native.metadata.junk, 0);
assert.equal(native.quality(native.metadata), null);
assert.equal(native.quality({ sourceAlpha:true, kept:.3, spread:250, soft:.2, hole:.04 }), null, '原生半透明披风误触发绿幕质检');
assert.equal(native.quality({ sourceAlpha:true, kept:0 }), '角色只剩 0%，被抠穿了');
const legacy = render('artifacts/elsa-2026-10-02/sprites-before.js', false);
const current = render('js/35-sprite.js', false);
assert.deepEqual(current.written, legacy.written, '旧绿幕素材的处理发生变化');
for (const key of ['cut','kept','soft','hole','junk','spread']) assert.equal(current.metadata[key], legacy.metadata[key], key);
const results = { timestamp:new Date().toISOString(),
  sourceAlpha:'PASS: 颜色和全部 alpha 值逐字节保留',
  quality:'PASS: 接受真实半透明披风，拒绝空白图',
  legacy:'PASS: 旧绿幕处理输出与替换前逐字节一致' };
fs.writeFileSync(path.join(ROOT, 'artifacts/elsa-2026-10-02/alpha-results.json'), JSON.stringify(results, null, 2));
console.log('PASS 原生透明 PNG 保留绿色、黑色、微透明和半透明像素');
console.log('PASS 原生透明质检接受披风、拒绝空白图');
console.log('PASS 原绿幕处理与修改前逐字节一致');
